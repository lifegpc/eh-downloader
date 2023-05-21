import { DB } from "sqlite/mod.ts";
import { SemVer } from "std/semver/mod.ts";
import { join, resolve } from "std/path/mod.ts";
import { SqliteError } from "sqlite/mod.ts";
import { Status } from "sqlite/src/constants.ts";
import { sleep, sure_dir_sync } from "./utils.ts";
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
};
type Tag = {
    id: number;
    tag: string;
    translated: string | undefined;
    intro: string | undefined;
};
export type EhFile = {
    id: number;
    gid: number;
    token: string;
    path: string;
    width: number;
    height: number;
    is_original: boolean;
};
export type EhFileRaw = {
    id: number;
    gid: number;
    token: string;
    path: string;
    width: number;
    height: number;
    is_original: number;
};
const ALL_TABLES = ["version", "task", "gmeta", "pmeta", "tag", "gtag", "file"];
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
    PRIMARY KEY (gid, token)
);`;
const TAG_TABLE = `CREATE TABLE tag (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag TEXT,
    translated TEXT,
    intro TEXT
);`;
const GTAG_TABLE = `CREATE TABLE gtag (
    gid INT,
    id INT,
    PRIMARY KEY (gid, id)
);`;
const FILE_TABLE = `CREATE TABLE file (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gid INT,
    token TEXT,
    path TEXT,
    width INT,
    height INT,
    is_original BOOLEAN
);`;

export class EhDb {
    db;
    #flock_enabled: boolean = eval('typeof Deno.flock !== "undefined"');
    #file: Deno.FsFile | undefined;
    #dblock: Deno.FsFile | undefined;
    #exist_table: Set<string> = new Set();
    #lock_file: string | undefined;
    #dblock_file: string | undefined;
    #_tags: Map<string, number> | undefined;
    readonly version = new SemVer("1.0.0-2");
    constructor(base_path: string) {
        const db_path = join(base_path, "data.db");
        sure_dir_sync(base_path);
        this.db = new DB(db_path);
        this.db.execute("PRAGMA main.locking_mode=EXCLUSIVE;");
        if (!this.#check_database()) this.#create_table();
        if (this.#flock_enabled) {
            this.#lock_file = join(base_path, "db.lock");
            this.#dblock_file = join(base_path, "eh.locked");
            this.#file = Deno.openSync(this.#lock_file, {
                create: true,
                write: true,
            });
            this.#dblock = Deno.openSync(this.#dblock_file, {
                create: true,
                write: true,
            });
            this.dblock();
        } else {
            console.log(
                "%cFile locking is disabled. Use --unstable to enable file locking.",
                "color: yellow;",
            );
        }
    }
    #add_tag(s: string) {
        return this.transaction(() => {
            this.db.query("INSERT INTO tag (tag) VALUES (?);", [s]);
            const r = this.db.queryEntries<Tag>(
                "SELECT * FROM tag WHERE tag = ?;",
                [s],
            );
            this.#tags.set(s, r[0].id);
            return r[0].id;
        });
    }
    #check_database() {
        this.#updateExistsTable();
        const v = this.#read_version();
        if (!v) return false;
        if (v.compare(this.version) === -1) {
            if (v.compare("1.0.0-1") === -1) {
                this.db.execute("ALTER TABLE tag ADD translated TEXT;");
                this.db.execute("ALTER TABLE tag ADD intro TEXT;");
            }
            if (v.compare("1.0.0-2") === -1) {
                this.convert_file(
                    this.db.queryEntries<EhFileRaw>("SELECT * FROM file;"),
                ).forEach((f) => {
                    f.path = resolve(f.path);
                    this.add_file(f, false);
                });
            }
            this.#write_version();
        }
        if (
            ALL_TABLES.length !== this.#exist_table.size ||
            !ALL_TABLES.every((x) => this.#exist_table.has(x))
        ) return false;
        return true;
    }
    #create_table() {
        if (!this.#exist_table.has("version")) {
            this.db.execute(VERSION_TABLE);
            this.#write_version();
        }
        if (!this.#exist_table.has("task")) {
            this.db.execute(TASK_TABLE);
        }
        if (!this.#exist_table.has("gmeta")) {
            this.db.execute(GMETA_TABLE);
        }
        if (!this.#exist_table.has("pmeta")) {
            this.db.execute(PMETA_TABLE);
        }
        if (!this.#exist_table.has("tag")) {
            this.db.execute(TAG_TABLE);
        }
        if (!this.#exist_table.has("gtag")) {
            this.db.execute(GTAG_TABLE);
        }
        if (!this.#exist_table.has("file")) {
            this.db.execute(FILE_TABLE);
        }
        this.#updateExistsTable();
    }
    #read_version() {
        if (!this.#exist_table.has("version")) return null;
        const cur = this.db.query<[string]>(
            "SELECT ver FROM version WHERE id = ?;",
            ["eh"],
        );
        for (const i of cur) {
            return new SemVer(i[0]);
        }
        return null;
    }
    get #tags() {
        if (this.#_tags === undefined) {
            const tags = this.db.queryEntries<Tag>("SELECT * FROM tag;");
            const re = new Map<string, number>();
            tags.forEach((v) => re.set(v.tag, v.id));
            this.#_tags = re;
            return re;
        } else return this.#_tags;
    }
    #updateExistsTable() {
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
    async add_gtag(gid: number, tags: Set<string>) {
        const otags = this.get_gtags(gid);
        const deleted: string[] = [];
        const added: string[] = [];
        for (const o of otags) {
            if (!tags.has(o)) deleted.push(o);
        }
        for (const o of tags) {
            if (!otags.has(o)) added.push(o);
        }
        for (const d of deleted) {
            const id = this.#tags.get(d);
            if (id === undefined) throw Error("id not found.");
            this.db.query("DELETE FROM gtag WHERE gid = ? AND id = ?;", [
                gid,
                id,
            ]);
        }
        for (const a of added) {
            let id = this.#tags.get(a);
            if (id === undefined) id = await this.#add_tag(a);
            this.db.query("INSERT INTO gtag VALUES (?, ?);", [gid, id]);
        }
    }
    add_file(f: EhFile, overwrite = true): EhFile {
        if (overwrite) {
            const ofiles = this.get_files(f.gid, f.token);
            if (ofiles.length) {
                const o = ofiles[0];
                f.id = o.id;
                ofiles.slice(1).forEach((o) => {
                    this.delete_file(o);
                });
            }
        }
        if (f.id) {
            this.db.query(
                "INSERT OR REPLACE INTO file VALUES (:id, :gid, :token, :path, :width, :height, :is_original);",
                f,
            );
            return structuredClone(f);
        } else {
            this.db.query(
                "INSERT INTO file (gid, token, path, width, height, is_original) VALUES (?, ?, ?, ?, ?, ?);",
                [f.gid, f.token, f.path, f.width, f.height, f.is_original],
            );
            const s = this.get_files(f.gid, f.token);
            return s[s.length - 1];
        }
    }
    add_pmeta(pmeta: PMeta) {
        this.db.queryEntries(
            "INSERT OR REPLACE INTO pmeta VALUES (:gid, :index, :token, :name, :width, :height)",
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
        }
        if (this.#dblock) {
            this.dbunlock();
            this.#dblock.close();
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
    convert_file(f: EhFileRaw[]) {
        return f.map((m) => {
            const b = m.is_original !== 0;
            const t = <EhFile> <unknown> m;
            t.is_original = b;
            return t;
        });
    }
    convert_gmeta(m: GMetaRaw[]): GMeta[] {
        return m.map((m) => {
            const b = m.expunged !== 0;
            const t = <GMeta> <unknown> m;
            t.expunged = b;
            return t;
        });
    }
    delete_file(f: EhFile) {
        this.db.query("DELETE FROM file WHERE id = ?;", [f.id]);
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
    dblock() {
        if (!this.#dblock) return;
        eval(`Deno.flockSync(${this.#dblock.rid}, true);`);
    }
    async funlock() {
        if (!this.#file) return;
        await eval(`Deno.funlock(${this.#file.rid});`);
    }
    dbunlock() {
        if (!this.#dblock) return;
        eval(`Deno.funlockSync(${this.#dblock.rid});`);
    }
    get_files(gid: number, token: string) {
        return this.convert_file(this.db.queryEntries<EhFileRaw>(
            "SELECT * FROM file WHERE gid = ? AND token = ?;",
            [gid, token],
        ));
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
    get_gtags(gid: number) {
        return new Set(
            this.db.query<[string]>(
                "SELECT tag.tag FROM gtag INNER JOIN tag ON tag.id = gtag.id WHERE gid = ?;",
                [gid],
            ).map((v) => v[0]),
        );
    }
    get_pmeta_by_index(gid: number, index: number) {
        const s = this.db.queryEntries<PMeta>(
            'SELECT * FROM pmeta WHERE gid = ? AND "index" = ?;',
            [gid, index],
        );
        return s.length ? s[0] : undefined;
    }
    get_pmeta_by_token(gid: number, token: string) {
        const s = this.db.queryEntries<PMeta>(
            "SELECT * FROM pmeta WHERE gid = ? AND token = ?;",
            [gid, token],
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
    optimize() {
        this.db.execute("VACUUM;");
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
    update_tags(tag: string, translated: string, intro: string) {
        const id = this.#tags.get(tag);
        if (id === undefined) {
            this.db.query(
                "INSERT INTO tag (tag, translated, intro) VALUES (?, ?, ?);",
                [tag, translated, intro],
            );
            const r = this.db.queryEntries<Tag>(
                "SELECT * FROM tag WHERE tag = ?;",
                [tag],
            );
            this.#tags.set(tag, r[0].id);
        } else {
            this.db.query("INSERT OR REPLACE INTO tag VALUES (?, ?, ?, ?)", [
                id,
                tag,
                translated,
                intro,
            ]);
        }
    }
}
