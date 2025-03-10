import { join } from "@std/path";
import { format as format_ver, parse as parse_ver } from "@std/semver";
import type { Config } from "../config.ts";
import { parse_bool, stackTrace, sure_dir_sync } from "../utils.ts";
import { Db, QueryParameterSet, SqliteMaster } from "./db_interface.ts";

const ALL_TABLES = [
    "version",
    "log",
];
const VERSION_TABLE = `CREATE TABLE version (
    id TEXT,
    ver TEXT,
    PRIMARY KEY (id)
);`;
const LOG_TABLE = `CREATE TABLE log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time INT,
    message TEXT,
    level INT,
    type TEXT,
    stack TEXT
);`;

export type LogEntry = {
    id: number | bigint;
    time: Date;
    message: string;
    level: LogLevel;
    type: string;
    stack?: string;
};

export type LogEntryRaw = {
    id: number | bigint;
    time: number | bigint;
    message: string;
    level: number | bigint;
    type: string;
    stack: string | null;
};

export const enum LogLevel {
    Trace = 1,
    Debug = 2,
    Log = 3,
    Info = 4,
    Warn = 5,
    Error = 6,
}

export type LoggerOptions = {
    /// Whether to record stack traces for logs.
    stack?: boolean | null;
};

export function format_message(
    message: unknown[],
    options?: Deno.InspectOptions,
) {
    return message.map((x) => {
        if (typeof x === "string") return x;
        return Deno.inspect(x, options);
    }).join(" ");
}

type EventMap = {
    new_log: LogEntry;
};

class BaseLogger extends EventTarget {
    db?: Db;
    #cfg?: Config;
    #exist_table: Set<string> = new Set();
    #use_ffi = false;
    readonly version = parse_ver("1.0.0-0");
    async init(cfg: Config) {
        this.#cfg = cfg;
        const base_path = cfg.db_path || cfg.base;
        const db_path = join(base_path, "logs.db");
        sure_dir_sync(base_path);
        this.#use_ffi = parse_bool(Deno.env.get("DB_USE_FFI") ?? "false");
        if (this.#use_ffi) {
            const DB = (await import("./db_ffi.ts")).DbFfi;
            this.db = new DB(db_path, { int64: true });
        } else {
            const DB = (await import("./db_wasm.ts")).DbWasm;
            this.db = new DB(db_path);
        }
        if (!this.#check_database()) this.#create_table();
    }
    #check_database() {
        if (!this.db) throw new Error("Database not initialized");
        this.#update_exists_table();
        const v = this.#read_version();
        if (!v) return false;
        if (
            ALL_TABLES.length !== this.#exist_table.size ||
            !ALL_TABLES.every((x) => this.#exist_table.has(x))
        ) return false;
        return true;
    }
    #create_table() {
        if (!this.db) return;
        if (!this.#exist_table.has("version")) {
            this.db.execute(VERSION_TABLE);
            this.#write_version();
        }
        if (!this.#exist_table.has("log")) {
            this.db.execute(LOG_TABLE);
        }
        this.#update_exists_table();
    }
    #read_version() {
        if (!this.db) return null;
        if (!this.#exist_table.has("version")) return null;
        const cur = this.db.query<[string]>(
            "SELECT ver FROM version WHERE id = ?;",
            ["logs"],
        );
        for (const i of cur) {
            return parse_ver(i[0]);
        }
        return null;
    }
    #update_exists_table() {
        if (!this.db) return;
        const cur = this.db.queryEntries<SqliteMaster>(
            "SELECT * FROM main.sqlite_master;",
        );
        this.#exist_table.clear();
        for (const i of cur) {
            if (i.type == "table") {
                this.#exist_table.add(i.name);
            }
        }
    }
    #write_version() {
        if (!this.db) return;
        this.db.transaction(() => {
            if (!this.db) return;
            this.db.query("INSERT OR REPLACE INTO version VALUES (?, ?);", [
                "logs",
                format_ver(this.version),
            ]);
        });
    }
    add(
        type: string,
        level: number,
        options?: LoggerOptions,
        ...messages: unknown[]
    ) {
        this.#fallback(type, level, ...messages);
        if (!this.db || !this.#cfg) return;
        const message = format_message(messages);
        const enable_stack = options?.stack ?? (this.#cfg.logging_stack ||
            (level >= LogLevel.Trace && level < LogLevel.Debug) ||
            level >= LogLevel.Warn);
        const stack = enable_stack ? stackTrace(2) : undefined;
        const now = new Date();
        const result = this.db.query<[number | bigint]>(
            "INSERT INTO log (time, message, level, type, stack) VALUES (?, ?, ?, ?, ?) RETURNING id;",
            [
                now.getTime(),
                message,
                level,
                type,
                stack === undefined ? null : stack,
            ],
        );
        if (result) {
            const entry: LogEntry = {
                id: result[0][0],
                time: now,
                message,
                level,
                type,
                stack,
            };
            this.dispatchEvent("new_log", entry);
        }
    }
    // @ts-ignore Better type inference
    addEventListener<T extends keyof EventMap>(
        type: T,
        callback: (e: CustomEvent<EventMap[T]>) => void | Promise<void>,
        options?: boolean | AddEventListenerOptions,
    ): void {
        super.addEventListener(type, <EventListener> callback, options);
    }
    clear(
        type?: string | null,
        min_level?: number | null,
        max_level?: number | null,
        deleted_level?: number[],
        end_time?: Date | null,
    ) {
        if (!this.db) return;
        const where = [];
        const args: QueryParameterSet = [];
        if (type) {
            where.push("type = ?");
            args.push(type);
        }
        if (min_level) {
            where.push("level >= ?");
            args.push(min_level);
        }
        if (max_level) {
            where.push("level <= ?");
            args.push(max_level);
        }
        if (deleted_level) {
            where.push(
                "level IN (" + deleted_level.map(() => "?").join(",") + ")",
            );
            args.push(...deleted_level);
        }
        if (end_time) {
            where.push("time <= ?");
            args.push(end_time.getTime());
        }
        const where_str = where.length ? " WHERE " + where.join(" AND ") : "";
        this.db.query(`DELETE FROM log${where_str};`, args);
    }
    close() {
        this.db?.close();
        this.db = undefined;
    }
    #convert(d: LogEntryRaw[]): LogEntry[] {
        return d.map((x) => {
            return {
                id: x.id,
                time: new Date(Number(x.time)),
                message: x.message,
                level: Number(x.level),
                type: x.type,
                stack: x.stack === null ? undefined : x.stack,
            };
        });
    }
    count(
        type?: string | null,
        min_level?: number | null,
        allowed_level?: number[],
    ) {
        if (!this.db) return 0;
        const where = [];
        const args: QueryParameterSet = [];
        if (type) {
            where.push("type = ?");
            args.push(type);
        }
        if (min_level) {
            where.push("level >= ?");
            args.push(min_level);
        }
        if (allowed_level) {
            where.push(
                "level IN (" + allowed_level.map(() => "?").join(",") + ")",
            );
            args.push(...allowed_level);
        }
        const where_str = where.length ? " WHERE " + where.join(" AND ") : "";
        const cur = this.db.query<[number | bigint]>(
            `SELECT COUNT(*) FROM log${where_str};`,
            args,
        );
        for (const i of cur) {
            return i[0];
        }
        return 0;
    }
    debug(type: string, ...messages: unknown[]) {
        this.add(type, LogLevel.Debug, undefined, ...messages);
    }
    delete_log(id: number | bigint) {
        if (!this.db) return;
        this.db.query("DELETE FROM log WHERE id = ?;", [id]);
    }
    // @ts-ignore Different parameters
    dispatchEvent<T extends keyof EventMap>(
        type: T,
        detail: EventMap[T],
    ): boolean {
        return super.dispatchEvent(new CustomEvent(type, { detail }));
    }
    error(type: string, ...messages: unknown[]) {
        this.add(type, LogLevel.Error, undefined, ...messages);
    }
    #fallback(type: string, level: number, ...messages: unknown[]) {
        if (type === "default") {
            if (level >= LogLevel.Error) {
                console.error(...messages, "\n" + stackTrace(3));
            } else if (level >= LogLevel.Warn) {
                console.warn(...messages, "\n" + stackTrace(3));
            } else if (level >= LogLevel.Info) {
                console.info(...messages);
            } else if (level >= LogLevel.Log) {
                console.log(...messages);
            } else if (level >= LogLevel.Debug) {
                console.debug(...messages);
            } else if (level >= LogLevel.Trace) {
                console.log("Trace:", ...messages, "\n" + stackTrace(3));
            }
            return;
        }
        if (level >= LogLevel.Error) {
            console.error(type + ":", ...messages, "\n" + stackTrace(3));
        } else if (level >= LogLevel.Warn) {
            console.warn(type + ":", ...messages, "\n" + stackTrace(3));
        } else if (level >= LogLevel.Info) {
            console.info(type + ":", ...messages);
        } else if (level >= LogLevel.Log) {
            console.log(type + ":", ...messages);
        } else if (level >= LogLevel.Debug) {
            console.debug(type + ":", ...messages);
        } else if (level >= LogLevel.Trace) {
            console.log(
                "Trace:",
                type + ":",
                ...messages,
                "\n" + stackTrace(3),
            );
        }
    }
    get_log(id: number | bigint) {
        if (!this.db) return null;
        const cur = this.#convert(this.db.queryEntries<LogEntryRaw>(
            "SELECT * FROM log WHERE id = ?;",
            [id],
        ));
        return cur.length ? cur[0] : null;
    }
    get_logger(type: string, options?: LoggerOptions) {
        return new Logger(this, type, options);
    }
    info(type: string, ...messages: unknown[]) {
        this.add(type, LogLevel.Info, undefined, ...messages);
    }
    list(
        offset: number = 0,
        limit: number = 50,
        type?: string | null,
        min_level?: number | null,
        allowed_level?: number[],
    ) {
        if (!this.db) return [];
        const where = [];
        const args: QueryParameterSet = [];
        if (type) {
            where.push("type = ?");
            args.push(type);
        }
        if (min_level) {
            where.push("level >= ?");
            args.push(min_level);
        }
        if (allowed_level) {
            where.push(
                "level IN (" + allowed_level.map(() => "?").join(",") + ")",
            );
            args.push(...allowed_level);
        }
        args.push(limit, offset);
        const where_str = where.length ? " WHERE " + where.join(" AND ") : "";
        const cur = this.db.queryEntries<LogEntryRaw>(
            `SELECT * FROM log${where_str} ORDER BY id DESC LIMIT ? OFFSET ?;`,
            args,
        );
        return this.#convert(cur);
    }
    list_page(
        page: number = 0,
        page_size: number = 50,
        type?: string | null,
        min_level?: number | null,
        allowed_level?: number[],
    ) {
        if (!this.db) return [];
        const where = [];
        const args: QueryParameterSet = [];
        if (type) {
            where.push("type = ?");
            args.push(type);
        }
        if (min_level) {
            where.push("level >= ?");
            args.push(min_level);
        }
        if (allowed_level) {
            where.push(
                "level IN (" + allowed_level.map(() => "?").join(",") + ")",
            );
            args.push(...allowed_level);
        }
        args.push(page_size, (page - 1) * page_size);
        const where_str = where.length ? " WHERE " + where.join(" AND ") : "";
        const cur = this.db.queryEntries<LogEntryRaw>(
            `SELECT * FROM log${where_str} ORDER BY id DESC LIMIT ? OFFSET ?;`,
            args,
        );
        return this.#convert(cur);
    }
    log(type: string, ...messages: unknown[]) {
        this.add(type, LogLevel.Log, undefined, ...messages);
    }
    optimize() {
        if (!this.db) return;
        this.db.query("VACUUM;");
    }
    // @ts-ignore Better type inference
    removeEventListener<T extends keyof EventMap>(
        type: T,
        callback: (e: CustomEvent<EventMap[T]>) => void | Promise<void>,
        options?: boolean | EventListenerOptions,
    ): void {
        super.removeEventListener(
            type,
            <EventListener> callback,
            options,
        );
    }
    trace(type: string, ...messages: unknown[]) {
        this.add(type, LogLevel.Trace, undefined, ...messages);
    }
    warn(type: string, ...messages: unknown[]) {
        this.add(type, LogLevel.Warn, undefined, ...messages);
    }
}

class Logger {
    #base: BaseLogger;
    #type: string;
    #options?: LoggerOptions;
    constructor(base: BaseLogger, type: string, options?: LoggerOptions) {
        this.#base = base;
        this.#type = type;
        this.#options = options;
    }
    debug(...messages: unknown[]) {
        this.#base.add(this.#type, LogLevel.Debug, this.#options, ...messages);
    }
    error(...messages: unknown[]) {
        this.#base.add(this.#type, LogLevel.Error, this.#options, ...messages);
    }
    info(...messages: unknown[]) {
        this.#base.add(this.#type, LogLevel.Info, this.#options, ...messages);
    }
    log(...messages: unknown[]) {
        this.#base.add(this.#type, LogLevel.Log, this.#options, ...messages);
    }
    trace(...messages: unknown[]) {
        this.#base.add(this.#type, LogLevel.Trace, this.#options, ...messages);
    }
    warn(...messages: unknown[]) {
        this.#base.add(this.#type, LogLevel.Warn, this.#options, ...messages);
    }
}

export const base_logger = new BaseLogger();
export const logger = base_logger.get_logger("default");
