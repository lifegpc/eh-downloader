const { DB } = await import("https://deno.land/x/sqlite@v3.7.2/mod.ts");
import { SemVer } from "https://deno.land/std@0.188.0/semver/mod.ts";
import { join } from "https://deno.land/std@0.188.0/path/mod.ts";
import { SqliteError } from "https://deno.land/x/sqlite@v3.7.2/mod.ts";
import { Status } from "https://deno.land/x/sqlite@v3.7.2/src/constants.ts";
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
const ALL_TABLES = ["version"];
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

export class EhDb {
    db;
    flock_enabled: boolean = eval('typeof Deno.flock !== "undefined"');
    file: Deno.FsFile | undefined;
    _exist_table: Set<string> = new Set();
    #lock_file: string | undefined;
    readonly version = new SemVer("1.0.0-0");
    constructor(base_path: string) {
        this.db = new DB(join(base_path, "data.db"));
        this.db.execute("PRAGMA main.locking_mode=EXCLUSIVE;");
        if (!this._check_database()) this._create_table();
        if (this.flock_enabled) {
            this.#lock_file = join(base_path, "db.lock");
            this.file = Deno.openSync(this.#lock_file, {
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
        if (this.file) {
            this.file.close();
            if (this.#lock_file) Deno.remove(this.#lock_file);
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
            const b = m.expunged === 1;
            const t = <GMeta> <unknown> m;
            t.expunged = b;
            return t;
        });
    }
    delete_task(task: Task) {
        return this.transaction(() => {
            this.db.query("DELETE FROM task WHERE id = ?;", [task.id]);
        });
    }
    async flock() {
        if (!this.file) return;
        await eval(`Deno.flock(${this.file.rid}, true);`);
    }
    async funlock() {
        if (!this.file) return;
        await eval(`Deno.funlock(${this.file.rid});`);
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
