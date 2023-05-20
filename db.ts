import { DB } from "sqlite/mod.ts";
import { SemVer } from "std/semver/mod.ts";
import { join } from "std/path/mod.ts";
import { SqliteError } from "sqlite/mod.ts";
import { Status } from "sqlite/src/constants.ts";
import { sleep } from "./utils.ts";
import { Task, TaskType } from "./task.ts";

type SqliteMaster = {
    type: string;
    name: string;
    tbl_name: string;
    rootpage: number;
    sql: string;
};
export enum SqliteTransactionType {
    DEFERRED = "DEFERRED",
    IMMEDIATE = "IMMEDIATE",
    EXCLUSIVE = "EXCLUSIVE",
}
export type GMeta = {
    gid: number;
    token: string;
    title: string;
    title_jpn: string;
    category: string;
    uploader: string;
    posted: number;
    filecount: number;
    filesize: number;
    expunged: boolean;
    rating: number;
    parent_gid: number | null;
    parent_key: string | null;
    first_gid: number | null;
    first_key: string | null;
};
export type GMetaRaw = {
    gid: number;
    token: string;
    title: string;
    title_jpn: string;
    category: string;
    uploader: string;
    posted: number;
    filecount: number;
    filesize: number;
    expunged: number;
    rating: number;
    parent_gid: number | null;
    parent_key: string | null;
    first_gid: number | null;
    first_key: string | null;
};
export type PMeta = {
    gid: number;
    index: number;
    token: string;
    name: string;
    width: number;
    height: number;
    is_original: boolean;
};
export type PMetaRaw = {
    gid: number;
    index: number;
    token: string;
    name: string;
    width: number;
    height: number;
    is_original: number;
};
const ALL_TABLES = ["version", "task", "gmeta", "pmeta"];
const VERSION_TABLE = `CREATE TABLE version (
    id TEXT,
    ver TEXT,
    PRIMARY KEY (id)
);`;
const TASK_TABLE = `CREATE TABLE task (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type INT,
    gid INT,
    token TEXT,
    pn INT,
    pid INT
);`;
const GMETA_TABLE = `CREATE TABLE gmeta (
    gid INT,
    token TEXT,
    title TEXT,
    title_jpn TEXT,
    category TEXT,
    uploader TEXT,
    posted INT,
    filecount INT,
    filesize INT,
    expunged BOOLEAN,
    rating REAL,
    parent_gid INT,
    parent_key TEXT,
    first_gid INT,
    first_key TEXT,
    PRIMARY KEY (gid)
);`;
const PMETA_TABLE = `CREATE TABLE pmeta (
    gid INT,
    "index" INT,
    token TEXT,
    name TEXT,
    width INT,
    height INT,
    is_original BOOLEAN,
    PRIMARY KEY (gid, token)
);`;

export class EhDb {
    db;
    flock_enabled: boolean = eval('typeof Deno.flock !== "undefined"');
    #file: Deno.FsFile | undefined;
    _exist_table: Set<string> = new Set();
    #lock_file: string | undefined;
    readonly version = new SemVer("1.0.0-0");
    constructor(base_path: string) {
        this.db = new DB(join(base_path, "data.db"));
        this.db.execute("PRAGMA main.locking_mode=EXCLUSIVE;");
        if (!this._check_database()) this._create_table();
        if (this.flock_enabled) {
            this.#lock_file = join(base_path, "db.lock");
            this.#file = Deno.openSync(this.#lock_file, {
                create: true,
                write: true,
            });
        } else {
            console.log(
                "%cFile locking is disabled. Use --unstable to enable file locking.",
                "color: yellow;",
            );
        }
    }
    _check_database() {
        this._updateExistsTable();
        const v = this._read_version();
        if (!v) return false;
        if (
            ALL_TABLES.length !== this._exist_table.size ||
            !ALL_TABLES.every((x) => this._exist_table.has(x))
        ) return false;
        return true;
    }
    _create_table() {
        if (!this._exist_table.has("version")) {
            this.db.execute(VERSION_TABLE);
            this._write_version();
        }
        if (!this._exist_table.has("task")) {
            this.db.execute(TASK_TABLE);
        }
        if (!this._exist_table.has("gmeta")) {
            this.db.execute(GMETA_TABLE);
        }
        if (!this._exist_table.has("pmeta")) {
            this.db.execute(PMETA_TABLE);
        }
        this._updateExistsTable();
    }
    _read_version() {
        if (!this._exist_table.has("version")) return null;
        const cur = this.db.query<[string]>(
            "SELECT ver FROM version WHERE id = ?;",
            ["eh"],
        );
        for (const i of cur) {
            return new SemVer(i[0]);
        }
        return null;
    }
    _updateExistsTable() {
        const cur = this.db.queryEntries<SqliteMaster>(
            "SELECT * FROM main.sqlite_master;",
        );
        this._exist_table.clear();
        for (const i of cur) {
            if (i.type == "table") {
                this._exist_table.add(i.name);
            }
        }
    }
    _write_version() {
        this.db.transaction(() => {
            this.db.query("INSERT OR REPLACE INTO version VALUES (?, ?);", [
                "eh",
                this.version.toString(),
            ]);
        });
    }
    add_gmeta(gmeta: GMeta) {
        this.db.queryEntries(
            "INSERT OR REPLACE INTO gmeta VALUES (:gid, :token, :title, :title_jpn, :category, :uploader, :posted, :filecount, :filesize, :expunged, :rating, :parent_gid, :parent_key, :first_gid, :first_key);",
            gmeta,
        );
    }
    add_pmeta(pmeta: PMeta) {
        this.db.queryEntries(
            "INSERT OR REPLACE INTO pmeta VALUES (:gid, :index, :token, :name, :width, :height, :is_original)",
            pmeta,
        );
    }
    add_task(task: Task) {
        return this.transaction(() => {
            this.db.query(
                "INSERT INTO task (type, gid, token, pn, pid) VALUES (?, ?, ?, ?, ?);",
                [task.type, task.gid, task.token, task.pn, task.pid],
            );
            return this.db.queryEntries<Task>(
                "SELECT * FROM task WHERE type = ? AND gid = ? AND token = ? AND pn = ? AND pid = ?;",
                [task.type, task.gid, task.token, task.pn, task.pid],
            )[0];
        });
    }
    begin(type: SqliteTransactionType) {
        try {
            this.db.execute(`BEGIN ${type} TRANSACTION;`);
            return true;
        } catch (e) {
            if (e instanceof SqliteError) {
                if (e.code == Status.SqliteBusy) return false;
            }
            throw e;
        }
    }
    check_download_task(gid: number, token: string) {
        return this.transaction(() => {
            const r = this.db.queryEntries<Task>(
                "SELECT * FROM task WHERE type = ? AND gid = ? AND token = ?;",
                [TaskType.Download, gid, token],
            );
            return r.length ? r[0] : undefined;
        });
    }
    close() {
        this.db.close();
        if (this.#file) {
            this.#file.close();
            if (this.#lock_file) Deno.removeSync(this.#lock_file);
        }
    }
    async commit() {
        while (1) {
            try {
                this.db.execute("COMMIT TRANSACTION;");
                break;
            } catch (e) {
                if (e instanceof SqliteError) {
                    if (e.code == Status.SqliteBusy) {
                        await sleep(1000);
                        continue;
                    }
                }
                throw e;
            }
        }
    }
    convert_gmeta(m: GMetaRaw[]): GMeta[] {
        return m.map((m) => {
            const b = m.expunged !== 0;
            const t = <GMeta> <unknown> m;
            t.expunged = b;
            return t;
        });
    }
    convert_pmeta(m: PMetaRaw[]): PMeta[] {
        return m.map((m) => {
            const b = m.is_original !== 0;
            const t = <PMeta> <unknown> m;
            t.is_original = b;
            return t;
        });
    }
    delete_task(task: Task) {
        return this.transaction(() => {
            this.db.query("DELETE FROM task WHERE id = ?;", [task.id]);
        });
    }
    async flock() {
        if (!this.#file) return;
        await eval(`Deno.flock(${this.#file.rid}, true);`);
    }
    async funlock() {
        if (!this.#file) return;
        await eval(`Deno.funlock(${this.#file.rid});`);
    }
    get_gmeta_by_gid(gid: number) {
        const s = this.convert_gmeta(
            this.db.queryEntries<GMetaRaw>(
                "SELECT * FROM gmeta WHERE gid = ?;",
                [gid],
            ),
        );
        return s.length ? s[0] : undefined;
    }
    get_pmeta_by_index(gid: number, index: number) {
        const s = this.convert_pmeta(
            this.db.queryEntries<PMetaRaw>(
                'SELECT * FROM pmeta WHERE gid = ? AND "index" = ?;',
                [gid, index],
            ),
        );
        return s.length ? s[0] : undefined;
    }
    get_pmeta_by_token(gid: number, token: string) {
        const s = this.convert_pmeta(
            this.db.queryEntries<PMetaRaw>(
                "SELECT * FROM pmeta WHERE gid = ? AND token = ?;",
                [gid, token],
            ),
        );
        return s.length ? s[0] : undefined;
    }
    get_tasks_by_pid(pid: number) {
        return this.transaction(() =>
            this.db.queryEntries<Task>("SELECT * FROM task WHERE pid = ?;", [
                pid,
            ])
        );
    }
    get_other_pid_tasks() {
        return this.transaction(() =>
            this.db.queryEntries<Task>("SELECT * FROM task WHERE pid != ?;", [
                Deno.pid,
            ])
        );
    }
    rollback() {
        this.db.execute("ROLLBACK TRANSACTION;");
    }
    set_task_pid(task: Task) {
        return this.transaction(() => {
            const t = this.db.queryEntries<Task>(
                "SELECT * FROM task WHERE id = ?;",
                [task.id],
            );
            if (!t.length) return null;
            if (t[0].pid != task.pid) return null;
            task.pid = Deno.pid;
            this.db.query("UPDATE task SET pid = ? WHERE id = ?;", [
                task.pid,
                task.id,
            ]);
            return task;
        });
    }
    async transaction<T>(
        cb: () => T | Promise<T>,
        type = SqliteTransactionType.EXCLUSIVE,
    ) {
        this.begin(type);
        await this.flock();
        try {
            let re = cb();
            if (re instanceof Promise) re = await re;
            await this.commit();
            await this.funlock();
            return re;
        } catch (e) {
            this.rollback();
            await this.funlock();
            throw e;
        }
    }
}
