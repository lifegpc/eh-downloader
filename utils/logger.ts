import { join } from "@std/path";
import { format as format_ver, parse as parse_ver } from "@std/semver";
import { parse_bool, stackTrace } from "../utils.ts";
import { Db, SqliteMaster } from "./db_interface.ts";

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

export const TRACE_LEVEL = 1;
export const DEBUG_LEVEL = 2;
export const LOG_LEVEL = 3;
export const INFO_LEVEL = 4;
export const WARN_LEVEL = 5;
export const ERROR_LEVEL = 6;

export function format_message(
    message: unknown[],
    options?: Deno.InspectOptions,
) {
    return message.map((x) => Deno.inspect(x, options)).join(" ");
}

class BaseLogger {
    db?: Db;
    #exist_table: Set<string> = new Set();
    #use_ffi = false;
    readonly version = parse_ver("1.0.0-0");
    async init(base_path: string) {
        const db_path = join(base_path, "logs.db");
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
    add(type: string, level: number, ...messages: unknown[]) {
        this.#fallback(type, level, ...messages);
        if (!this.db) return;
        const message = format_message(messages);
        const stack =
            (level >= TRACE_LEVEL && level < DEBUG_LEVEL) || level >= WARN_LEVEL
                ? stackTrace(2)
                : undefined;
        this.db.query(
            "INSERT INTO log (time, message, level, type, stack) VALUES (?, ?, ?, ?, ?);",
            [
                Date.now(),
                message,
                level,
                type,
                stack === undefined ? null : stack,
            ],
        );
    }
    close() {
        this.db?.close();
        this.db = undefined;
    }
    debug(type: string, ...messages: unknown[]) {
        this.add(type, DEBUG_LEVEL, ...messages);
    }
    error(type: string, ...messages: unknown[]) {
        this.add(type, ERROR_LEVEL, ...messages);
    }
    #fallback(type: string, level: number, ...messages: unknown[]) {
        if (type === "default") {
            if (level >= ERROR_LEVEL) {
                console.error(...messages, "\n" + stackTrace(3));
            } else if (level >= WARN_LEVEL) {
                console.warn(...messages, "\n" + stackTrace(3));
            } else if (level >= INFO_LEVEL) {
                console.info(...messages);
            } else if (level >= LOG_LEVEL) {
                console.log(...messages);
            } else if (level >= DEBUG_LEVEL) {
                console.debug(...messages);
            } else if (level >= TRACE_LEVEL) {
                console.log("Trace:", ...messages, "\n" + stackTrace(3));
            }
            return;
        }
        if (level >= ERROR_LEVEL) {
            console.error(type + ":", ...messages, "\n" + stackTrace(3));
        } else if (level >= WARN_LEVEL) {
            console.warn(type + ":", ...messages, "\n" + stackTrace(3));
        } else if (level >= INFO_LEVEL) {
            console.info(type + ":", ...messages);
        } else if (level >= LOG_LEVEL) {
            console.log(type + ":", ...messages);
        } else if (level >= DEBUG_LEVEL) {
            console.debug(type + ":", ...messages);
        } else if (level >= TRACE_LEVEL) {
            console.log(
                "Trace:",
                type + ":",
                ...messages,
                "\n" + stackTrace(3),
            );
        }
    }
    get_logger(type: string) {
        return new Logger(this, type);
    }
    info(type: string, ...messages: unknown[]) {
        this.add(type, INFO_LEVEL, ...messages);
    }
    log(type: string, ...messages: unknown[]) {
        this.add(type, LOG_LEVEL, ...messages);
    }
    trace(type: string, ...messages: unknown[]) {
        this.add(type, TRACE_LEVEL, ...messages);
    }
    warn(type: string, ...messages: unknown[]) {
        this.add(type, WARN_LEVEL, ...messages);
    }
}

class Logger {
    #base: BaseLogger;
    #type: string;
    constructor(base: BaseLogger, type: string) {
        this.#base = base;
        this.#type = type;
    }
    debug(...messages: unknown[]) {
        this.#base.add(this.#type, DEBUG_LEVEL, ...messages);
    }
    error(...messages: unknown[]) {
        this.#base.add(this.#type, ERROR_LEVEL, ...messages);
    }
    info(...messages: unknown[]) {
        this.#base.add(this.#type, INFO_LEVEL, ...messages);
    }
    log(...messages: unknown[]) {
        this.#base.add(this.#type, LOG_LEVEL, ...messages);
    }
    trace(...messages: unknown[]) {
        this.#base.add(this.#type, TRACE_LEVEL, ...messages);
    }
    warn(...messages: unknown[]) {
        this.#base.add(this.#type, WARN_LEVEL, ...messages);
    }
}

export const base_logger = new BaseLogger();
export const logger = base_logger.get_logger("default");
