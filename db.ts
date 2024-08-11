import { Db, QueryParameter } from "./utils/db_interface.ts";
import {
    compare as compare_ver,
    format as format_ver,
    parse as parse_ver,
} from "@std/semver";
import { unescape } from "@std/html";
import { join, resolve } from "@std/path";
import { SqliteError } from "sqlite/mod.ts";
import { SqliteError as Sqlite3Error } from "sqlite3";
import { Status } from "sqlite/src/constants.ts";
import {
    parse_bool,
    sleep,
    sure_dir_sync,
    toJSON,
    try_remove_sync,
} from "./utils.ts";
import { Task, TaskType } from "./task.ts";
import { generate as randomstring } from "randomstring";
import type { GalleryMetadataSingle } from "./page/GalleryMetadata.ts";

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
    gid: number | bigint;
    token: string;
    title: string;
    title_jpn: string;
    category: string;
    uploader: string;
    posted: number | bigint;
    filecount: number | bigint;
    filesize: number | bigint;
    expunged: boolean;
    rating: number | bigint;
    parent_gid: number | bigint | null;
    parent_key: string | null;
    first_gid: number | bigint | null;
    first_key: string | null;
};
export type GMetaRaw = {
    gid: number | bigint;
    token: string;
    title: string;
    title_jpn: string;
    category: string;
    uploader: string;
    posted: number | bigint;
    filecount: number | bigint;
    filesize: number | bigint;
    expunged: number | bigint;
    rating: number | bigint;
    parent_gid: number | bigint | null;
    parent_key: string | null;
    first_gid: number | bigint | null;
    first_key: string | null;
};
export type PMeta = {
    gid: number | bigint;
    index: number | bigint;
    token: string;
    name: string;
    width: number | bigint;
    height: number | bigint;
};
export type ExtendedPMeta = {
    gid: number | bigint;
    index: number | bigint;
    token: string;
    name: string;
    width: number | bigint;
    height: number | bigint;
    is_nsfw: boolean;
    is_ad: boolean;
};
export type ExtendedPMetaRaw = {
    gid: number | bigint;
    index: number | bigint;
    token: string;
    name: string;
    width: number | bigint;
    height: number | bigint;
    is_nsfw: number | bigint | null;
    is_ad: number | bigint | null;
};
export type Tag = {
    id: number | bigint;
    tag: string;
    translated: string | undefined;
    intro: string | undefined;
};
export type EhFile = {
    id: number | bigint;
    token: string;
    path: string;
    width: number | bigint;
    height: number | bigint;
    is_original: boolean;
};
type EhFileRawV1 = {
    id: number | bigint;
    gid: number | bigint;
    token: string;
    path: string;
    width: number | bigint;
    height: number | bigint;
    is_original: number | bigint;
};
export type EhFileRaw = {
    id: number | bigint;
    token: string;
    path: string;
    width: number | bigint;
    height: number | bigint;
    is_original: number | bigint;
};
export type EhFileMeta = {
    token: string;
    is_nsfw: boolean;
    is_ad: boolean;
};
export type EhFileMetaRaw = {
    token: string;
    is_nsfw: number | bigint;
    is_ad: number | bigint;
};
export enum UserPermission {
    None = 0,
    ReadGallery = 1 << 0,
    EditGallery = 1 << 1,
    DeleteGallery = 1 << 2,
    ManageTasks = 1 << 3,
    ShareGallery = 1 << 4,
    All = ~(~0 << 5),
}
export type User = {
    id: number | bigint;
    username: string;
    password: Uint8Array;
    is_admin: boolean;
    permissions: UserPermission;
};
type UserRaw = {
    id: number | bigint;
    username: string;
    password: Uint8Array;
    is_admin: number | bigint;
    permissions: UserPermission;
};
export type Token = {
    id: number | bigint;
    uid: number | bigint;
    token: string;
    expired: Date;
    http_only: boolean;
    secure: boolean;
    last_used: Date;
    client: string | null;
    device: string | null;
    client_version: string | null;
    client_platform: string | null;
};
type TokenRaw = {
    id: number | bigint;
    uid: number | bigint;
    token: string;
    expired: string;
    http_only: number | bigint;
    secure: number | bigint;
    last_used: string;
    client: string | null;
    device: string | null;
    client_version: string | null;
    client_platform: string | null;
};
export type ClientConfig = {
    uid: number | bigint;
    client: string;
    name: string;
    data: string;
};
export enum SharedTokenType {
    Gallery,
}
export type GallerySharedTokenInfo = {
    gid: number | bigint;
};
type SharedTokenTypeMap = {
    [SharedTokenType.Gallery]: GallerySharedTokenInfo;
};
export type SharedToken<T extends SharedTokenType = SharedTokenType> = {
    id: number | bigint;
    token: string;
    expired: Date | null;
    type: T;
    info: SharedTokenTypeMap[T];
};
type SharedTokenRaw = {
    id: number | bigint;
    token: string;
    expired: Date | null;
    type: SharedTokenType;
    info: string;
};
const ALL_TABLES = [
    "version",
    "task",
    "gmeta",
    "pmeta",
    "tag",
    "gtag",
    "file",
    "filemeta",
    "user",
    "token",
    "ehmeta",
    "client_config",
    "shared_token",
];
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
    pid INT,
    details TEXT
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
    PRIMARY KEY (gid, "index")
);`;
const PMETA_INDEX = `CREATE INDEX pmeta_token ON pmeta (token);`;
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
    token TEXT,
    path TEXT,
    width INT,
    height INT,
    is_original BOOLEAN
);`;
const FILE_INDEX = `CREATE INDEX file_token ON file (token);`;
const FILEMETA_TABLE = `CREATE TABLE filemeta (
    token TEXT,
    is_nsfw BOOLEAN,
    is_ad BOOLEAN,
    PRIMARY KEY (token)
);`;
const USER_TABLE = `CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password BLOB,
    is_admin BOOLEAN,
    permissions INT
);`;
const TOKEN_TABLE = `CREATE TABLE token (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid INT,
    token TEXT,
    expired TEXT,
    http_only BOOLEAN,
    secure BOOLEAN,
    last_used TEXT,
    client TEXT,
    device TEXT,
    client_version TEXT,
    client_platform TEXT
);`;
const EHMETA_TABLE = `CREATE TABLE ehmeta (
    gid INT,
    data TEXT,
    cached_time TEXT,
    PRIMARY KEY (gid)
);`;
const CLIENT_CONFIG_TABLE = `CREATE TABLE client_config (
    uid INT,
    client TEXT,
    name TEXT,
    data TEXT,
    PRIMARY KEY (uid, client, name)
);`;
const SHARED_TOKEN_TABLE = `CREATE TABLE shared_token (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT,
    expired TEXT,
    type INT,
    info TEXT
);`;

function escape_fields(fields: string, namespace: string) {
    const fs = fields.split(",");
    return fs.map((f) => {
        return `${namespace}.${f.trim()}`;
    }).join(",");
}

export class EhDb {
    // @ts-ignore Ignore
    db: Db;
    #flock_enabled: boolean = eval('typeof Deno.flock !== "undefined"');
    #file: Deno.FsFile | undefined;
    #dblock: Deno.FsFile | undefined;
    #exist_table: Set<string> = new Set();
    #lock_file: string | undefined;
    #dblock_file: string | undefined;
    #_tags: Map<string, number | bigint> | undefined;
    #base_path: string;
    #db_path: string;
    #use_ffi = false;
    readonly version = parse_ver("1.0.0-14");
    constructor(base_path: string) {
        this.#base_path = base_path;
        this.#db_path = join(base_path, "data.db");
        sure_dir_sync(base_path);
    }
    async init() {
        this.#use_ffi = parse_bool(Deno.env.get("DB_USE_FFI") ?? "false");
        if (this.#use_ffi) {
            const DB = (await import("./utils/db_ffi.ts")).DbFfi;
            this.db = new DB(this.#db_path, { int64: true });
        } else {
            const DB = (await import("./utils/db_wasm.ts")).DbWasm;
            this.db = new DB(this.#db_path);
        }
        if (!this.#check_database()) this.#create_table();
        if (!this.#use_ffi && this.#flock_enabled) {
            this.#lock_file = join(this.#base_path, "db.lock");
            this.#dblock_file = join(this.#base_path, "eh.locked");
            this.#file = Deno.openSync(this.#lock_file, {
                create: true,
                write: true,
            });
            this.#dblock = Deno.openSync(this.#dblock_file, {
                create: true,
                write: true,
            });
            this.dblock();
        } else if (!this.#use_ffi) {
            console.log(
                "%cFile locking is disabled. Use --unstable to enable file locking.",
                "color: yellow;",
            );
        }
        this.remove_expired_token();
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
        if (compare_ver(v, this.version) === -1) {
            let need_optimize = false;
            if (compare_ver(v, parse_ver("1.0.0-1")) === -1) {
                this.db.execute("ALTER TABLE tag ADD translated TEXT;");
                this.db.execute("ALTER TABLE tag ADD intro TEXT;");
            }
            if (compare_ver(v, parse_ver("1.0.0-2")) === -1) {
                this.convert_file(
                    this.db.queryEntries<EhFileRaw>("SELECT * FROM file;"),
                ).forEach((f) => {
                    f.path = resolve(f.path);
                    this.add_file(f, false);
                });
            }
            if (compare_ver(v, parse_ver("1.0.0-3")) === -1) {
                this.db.execute("ALTER TABLE task ADD details TEXT;");
            }
            if (compare_ver(v, parse_ver("1.0.0-4")) === -1) {
                this.db.execute("ALTER TABLE pmeta RENAME TO pmeta_origin;");
                this.db.execute(PMETA_TABLE);
                this.db.execute(
                    'INSERT INTO pmeta (gid, "index", token, name, width, height) SELECT gid, "index", token, name, width, height FROM pmeta_origin;',
                );
                this.db.execute("DROP TABLE pmeta_origin;");
                need_optimize = true;
            }
            if (compare_ver(v, parse_ver("1.0.0-5")) === -1) {
                this.db.execute("ALTER TABLE task DROP pn;");
            }
            if (compare_ver(v, parse_ver("1.0.0-6")) === -1) {
                let offset = 0;
                let tasks = this.convert_gmeta(
                    this.db.queryEntries<GMetaRaw>(
                        "SELECT * FROM gmeta LIMIT 20 OFFSET 0;",
                    ),
                );
                while (tasks.length) {
                    tasks.forEach((t) => {
                        t.title = unescape(t.title);
                        t.title_jpn = unescape(t.title_jpn);
                        t.uploader = unescape(t.uploader);
                        this.add_gmeta(t);
                    });
                    offset += tasks.length;
                    tasks = this.convert_gmeta(
                        this.db.queryEntries<GMetaRaw>(
                            "SELECT * FROM gmeta LIMIT 20 OFFSET ?;",
                            [offset],
                        ),
                    );
                }
            }
            if (compare_ver(v, parse_ver("1.0.0-7")) === -1) {
                this.db.execute("ALTER TABLE file RENAME TO file_origin;");
                this.db.execute(FILE_TABLE);
                let offset = 0;
                let files = this.db.queryEntries<EhFileRawV1>(
                    "SELECT * FROM file_origin LIMIT 20 OFFSET 0;",
                );
                const d: string[] = [];
                while (files.length) {
                    files.forEach((f) => {
                        if (!d.includes(f.token)) {
                            d.push(f.token);
                            const g: Record<string, unknown> = f;
                            delete g["gid"];
                            this.add_file(g as EhFile, false);
                        } else {
                            try_remove_sync(f.path);
                            console.log("Deleted ", f.path);
                        }
                    });
                    offset += files.length;
                    files = this.db.queryEntries<EhFileRawV1>(
                        "SELECT * FROM file_origin LIMIT 20 OFFSET ?;",
                        [offset],
                    );
                }
                this.db.execute("DROP TABLE file_origin;");
                need_optimize = true;
            }
            if (compare_ver(v, parse_ver("1.0.0-8")) === -1) {
                this.db.execute("DROP TABLE token;");
                this.db.execute(`CREATE TABLE token (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uid INT,
                    token TEXT,
                    expired TEXT);`);
            }
            if (compare_ver(v, parse_ver("1.0.0-9")) === -1) {
                this.db.execute("ALTER TABLE token ADD http_only BOOLEAN;");
                this.db.execute("ALTER TABLE token ADD secure BOOLEAN;");
                this.db.execute("UPDATE token SET http_only = 1, secure = 0;");
            }
            if (compare_ver(v, parse_ver("1.0.0-10")) === -1) {
                this.db.execute(FILE_INDEX);
            }
            if (compare_ver(v, parse_ver("1.0.0-11")) === -1) {
                this.db.execute("ALTER TABLE token ADD last_used TEXT;");
                this.db.execute(
                    "UPDATE token SET last_used = '1970-01-01T00:00:00.000Z';",
                );
            }
            if (compare_ver(v, parse_ver("1.0.0-12")) === -1) {
                this.db.execute("ALTER TABLE token ADD client TEXT;");
                this.db.execute("ALTER TABLE token ADD device TEXT;");
                this.db.execute("ALTER TABLE token ADD client_version TEXT;");
                this.db.execute("ALTER TABLE token ADD client_platform TEXT;");
            }
            if (compare_ver(v, parse_ver("1.0.0-14")) === -1) {
                this.db.execute(PMETA_INDEX);
            }
            this.#write_version();
            if (need_optimize) this.optimize();
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
            this.db.execute(FILE_INDEX);
        }
        if (!this.#exist_table.has("filemeta")) {
            this.db.execute(FILEMETA_TABLE);
        }
        if (!this.#exist_table.has("user")) {
            this.db.execute(USER_TABLE);
        }
        if (!this.#exist_table.has("token")) {
            this.db.execute(TOKEN_TABLE);
        }
        if (!this.#exist_table.has("ehmeta")) {
            this.db.execute(EHMETA_TABLE);
        }
        if (!this.#exist_table.has("client_config")) {
            this.db.execute(CLIENT_CONFIG_TABLE);
        }
        if (!this.#exist_table.has("shared_token")) {
            this.db.execute(SHARED_TOKEN_TABLE);
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
            return parse_ver(i[0]);
        }
        return null;
    }
    get #tags() {
        if (this.#_tags === undefined) {
            const tags = this.db.queryEntries<Tag>("SELECT * FROM tag;");
            const re = new Map<string, number | bigint>();
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
                format_ver(this.version),
            ]);
        });
    }
    add_client_config(config: ClientConfig) {
        this.db.queryEntries(
            "INSERT OR REPLACE INTO client_config VALUES (:uid, :client, :name, :data);",
            config,
        );
    }
    add_ehmeta(data: GalleryMetadataSingle) {
        this.db.query(
            "INSERT OR REPLACE INTO ehmeta VALUES (?, ?, ?);",
            [data.gid, toJSON(data), new Date()],
        );
    }
    add_gmeta(gmeta: GMeta) {
        this.db.queryEntries(
            "INSERT OR REPLACE INTO gmeta VALUES (:gid, :token, :title, :title_jpn, :category, :uploader, :posted, :filecount, :filesize, :expunged, :rating, :parent_gid, :parent_key, :first_gid, :first_key);",
            gmeta,
        );
    }
    async add_gtag(gid: number | bigint, tags: Set<string>) {
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
            const ofiles = this.get_files(f.token);
            if (ofiles.length) {
                const o = ofiles[0];
                f.id = o.id;
                ofiles.slice(1).forEach((o) => {
                    this.delete_file(o);
                });
                ofiles.forEach((o) => {
                    if (o.path !== f.path) {
                        try_remove_sync(o.path);
                        console.log("Deleted ", o.path);
                    }
                });
            }
        }
        if (f.id) {
            this.db.query(
                "INSERT OR REPLACE INTO file VALUES (:id, :token, :path, :width, :height, :is_original);",
                f,
            );
            return structuredClone(f);
        } else {
            this.db.query(
                "INSERT INTO file (token, path, width, height, is_original) VALUES (?, ?, ?, ?, ?);",
                [f.token, f.path, f.width, f.height, f.is_original],
            );
            const s = this.get_files(f.token);
            return s[s.length - 1];
        }
    }
    add_filemeta(m: EhFileMeta) {
        this.db.query(
            "INSERT OR REPLACE INTO filemeta VALUES (:token, :is_nsfw, :is_ad);",
            m,
        );
    }
    add_pmeta(pmeta: PMeta) {
        this.db.queryEntries(
            "INSERT OR REPLACE INTO pmeta VALUES (:gid, :index, :token, :name, :width, :height)",
            pmeta,
        );
    }
    add_root_user(username: string, password: Uint8Array) {
        this.db.query("INSERT OR REPLACE INTO user VALUES (?, ?, ?, ?, ?);", [
            0,
            username,
            password,
            true,
            UserPermission.All,
        ]);
    }
    add_shared_token<T extends SharedTokenType = SharedTokenType>(
        type: T,
        info: SharedTokenTypeMap[T],
        expired: Date | null = null,
    ) {
        let token = randomstring();
        while (this.get_token(token) || this.get_shared_token(token)) {
            token = randomstring();
        }
        this.db.query(
            "INSERT INTO shared_token (token, expired, type, info) VALUES (?, ?, ?, ?);",
            [token, expired, type, toJSON(info)],
        );
        const t = this.get_shared_token(token);
        if (!t) throw Error("Failed to add shared token");
        return t;
    }
    add_task(task: Task) {
        return this.transaction(() => {
            this.db.query(
                "INSERT INTO task (type, gid, token, pid, details) VALUES (?, ?, ?, ?, ?);",
                [
                    task.type,
                    task.gid,
                    task.token,
                    task.pid,
                    task.details,
                ],
            );
            if (task.details === null) {
                return this.db.queryEntries<Task>(
                    "SELECT * FROM task WHERE type = ? AND gid = ? AND token = ? AND pid = ?;",
                    [
                        task.type,
                        task.gid,
                        task.token,
                        task.pid,
                    ],
                )[0];
            }
            return this.db.queryEntries<Task>(
                "SELECT * FROM task WHERE type = ? AND gid = ? AND token = ? AND pid = ? AND details = ?;",
                [
                    task.type,
                    task.gid,
                    task.token,
                    task.pid,
                    task.details,
                ],
            )[0];
        });
    }
    add_token(
        uid: number | bigint,
        added: number,
        http_only: boolean,
        secure: boolean,
        client: string | null,
        device: string | null,
        client_version: string | null,
        client_platform: string | null,
    ): Token {
        let token = randomstring();
        while (this.get_token(token) || this.get_shared_token(token)) {
            token = randomstring();
        }
        this.db.query(
            "INSERT INTO token (uid, token, expired, http_only, secure, last_used, client, device, client_version, client_platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
            [
                uid,
                token,
                new Date(added + 2592000000),
                http_only,
                secure,
                new Date(added),
                client,
                device,
                client_version,
                client_platform,
            ],
        );
        const t = this.get_token(token);
        if (!t) throw Error("Failed to add token.");
        return t;
    }
    add_user(user: User) {
        if (user.id === 0 || user.id === 0n) {
            this.db.query(
                "INSERT INTO user (username, password, is_admin, permissions) VALUES (?, ?, ?, ?);",
                [
                    user.username,
                    user.password,
                    user.is_admin,
                    user.permissions,
                ],
            );
        } else {
            this.db.query(
                "INSERT OR REPLACE INTO user VALUES (?, ?, ?, ?, ?);",
                [
                    user.id,
                    user.username,
                    user.password,
                    user.is_admin,
                    user.permissions,
                ],
            );
        }
        const u = this.get_user_by_name(user.username);
        if (!u) throw Error("Failed to add/update user.");
        return u;
    }
    begin(type: SqliteTransactionType) {
        try {
            this.db.execute(`BEGIN ${type} TRANSACTION;`);
            return true;
        } catch (e) {
            if (e instanceof SqliteError) {
                if (e.code == Status.SqliteBusy) return false;
            }
            if (e instanceof Sqlite3Error) {
                // SQLITE_BUSY
                if (e.code == 5) return false;
            }
            throw e;
        }
    }
    better_optimize() {
        const d = this.db.query<[string, number | bigint]>(
            "SELECT * FROM main.sqlite_sequence",
        );
        d.forEach(([name, count]) => {
            const c = this.db.query<[number | bigint]>(
                `SELECT COUNT(*) FROM "${name}";`,
            )[0][0];
            if (c != count) {
                const d = this.db.query<[number | bigint]>(
                    `SELECT id FROM "${name}";`,
                );
                d.forEach((d, i) => {
                    const r = i + 1;
                    if (d[0] != r) {
                        this.db.query(
                            `UPDATE "${name}" SET id = ? WHERE id = ?;`,
                            [r, d[0]],
                        );
                        if (name === "tag") {
                            this.db.query(
                                "UPDATE gtag SET id = ? WHERE id = ?;",
                                [r, d[0]],
                            );
                        }
                    }
                });
                this.db.query(
                    "UPDATE sqlite_sequence SET seq = ? WHERE name = ?;",
                    [c, name],
                );
            }
        });
    }
    check_download_task(gid: number | bigint, token: string) {
        return this.transaction(() => {
            const r = this.db.queryEntries<Task>(
                "SELECT * FROM task WHERE (type = ? OR type = ?) AND gid = ? AND token = ?;",
                [TaskType.Download, TaskType.Import, gid, token],
            );
            return r.length ? r[0] : undefined;
        });
    }
    check_fix_gallery_page_task() {
        return this.transaction(() => {
            const r = this.db.queryEntries<Task>(
                "SELECT * FROM task WHERE type = ?;",
                [TaskType.FixGalleryPage],
            );
            return r.length ? r[0] : undefined;
        });
    }
    check_onetime_task() {
        return this.transaction(() => {
            const r = this.db.queryEntries<Task>(
                "SELECT * FROM task WHERE type = ? OR type = ?;",
                [TaskType.UpdateMeiliSearchData, TaskType.FixGalleryPage],
            );
            return r;
        });
    }
    check_update_meili_search_data_task(gid?: number | bigint) {
        const args: QueryParameter[] = [TaskType.UpdateMeiliSearchData];
        let wsql = "";
        if (gid !== undefined) {
            wsql = " AND gid = ?";
            args.push(gid);
        }
        return this.transaction(() => {
            const r = this.db.queryEntries<Task>(
                `SELECT * FROM task WHERE type = ?${wsql};`,
                args,
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
    convert_extended_pmeta(m: ExtendedPMetaRaw[]) {
        return m.map((m) => {
            const n = m.is_nsfw ? true : false;
            const a = m.is_ad ? true : false;
            const t = <ExtendedPMeta> <unknown> m;
            t.is_nsfw = n;
            t.is_ad = a;
            return t;
        });
    }
    convert_file(f: EhFileRaw[]) {
        return f.map((m) => {
            const b = m.is_original != 0;
            const t = <EhFile> <unknown> m;
            t.is_original = b;
            return t;
        });
    }
    convert_filemeta(m: EhFileMetaRaw[]) {
        return m.map((m) => {
            const n = m.is_nsfw != 0;
            const a = m.is_ad != 0;
            const t = <EhFileMeta> <unknown> m;
            t.is_nsfw = n;
            t.is_ad = a;
            return t;
        });
    }
    convert_gmeta(m: GMetaRaw[]): GMeta[] {
        return m.map((m) => {
            if (m.expunged === undefined) return <GMeta> <unknown> m;
            const b = m.expunged != 0;
            const t = <GMeta> <unknown> m;
            t.expunged = b;
            return t;
        });
    }
    convert_shared_token(m: SharedTokenRaw[]) {
        return m.map((m) => {
            const e = m.expired ? new Date(m.expired) : null;
            const t = <SharedToken> <unknown> m;
            t.expired = e;
            t.info = JSON.parse(m.info);
            return t;
        });
    }
    convert_token(m: TokenRaw[]) {
        return m.map((m) => {
            const e = new Date(m.expired);
            const h = m.http_only != 0;
            const s = m.secure != 0;
            const t = <Token> <unknown> m;
            const l = new Date(m.last_used);
            t.expired = e;
            t.http_only = h;
            t.secure = s;
            t.last_used = l;
            return t;
        });
    }
    convert_user(m: UserRaw[]) {
        return m.map((m) => {
            const a = m.is_admin != 0;
            const t = <User> <unknown> m;
            t.is_admin = a;
            if (t.is_admin) t.permissions = UserPermission.All;
            return t;
        });
    }
    delete_client_config(uid: number | bigint, client: string, name: string) {
        this.db.query(
            "DELETE FROM client_config WHERE uid = ? AND client = ? AND name = ?;",
            [uid, client, name],
        );
    }
    delete_file(f: EhFile) {
        this.db.query("DELETE FROM file WHERE id = ?;", [f.id]);
    }
    delete_files(token: string) {
        const files = this.get_files(token);
        this.db.query("DELETE FROM file WHERE token = ?;", [token]);
        this.db.query("DELETE FROM filemeta WHERE token = ?;", [token]);
        files.forEach((f) => {
            try_remove_sync(f.path);
            console.log("Deleted ", f.path);
        });
    }
    delete_gallery(gid: number | bigint) {
        this.db.query("DELETE FROM gmeta WHERE gid = ?;", [gid]);
        this.db.query("DELETE FROM gtag WHERE gid = ?;", [gid]);
        const tokens = new Set(
            this.db.query<[string]>("SELECT token FROM pmeta WHERE gid = ?;", [
                gid,
            ]).map((v) => v[0]),
        );
        this.db.query("DELETE FROM pmeta WHERE gid = ?;", [gid]);
        for (const token of tokens) {
            const count = this.db.query<[number | bigint]>(
                "SELECT COUNT(*) FROM pmeta WHERE token = ?;",
                [token],
            )[0][0];
            if (count === 0 || count === 0n) this.delete_files(token);
        }
    }
    delete_task(task: Task) {
        return this.transaction(() => {
            this.db.query("DELETE FROM task WHERE id = ?;", [task.id]);
        });
    }
    delete_task_by_id(id: number | bigint) {
        return this.transaction(() => {
            this.db.query("DELETE FROM task WHERE id = ?;", [id]);
        });
    }
    delete_token(token: string) {
        this.db.query("DELETE FROM token WHERE token = ?;", [token]);
    }
    delete_user(id: number | bigint) {
        this.db.query("DELETE FROM user WHERE id = ?;", [id]);
        this.db.query("DELETE FROM token WHERE uid = ?;", [id]);
        this.db.query("DELETE FROM client_config WHERE uid = ?;", [id]);
    }
    delete_user_token(uid: number | bigint, excluded_token?: number | bigint) {
        let where = "";
        const args = [uid];
        if (excluded_token) {
            where = " AND id != ?";
            args.push(excluded_token);
        }
        this.db.query(`DELETE FROM token WHERE uid = ?${where};`, args);
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
    get_client_config(uid: number | bigint, client: string, name: string) {
        const d = this.db.queryEntries<ClientConfig>(
            "SELECT * FROM client_config WHERE uid = ? AND client = ? AND name = ?;",
            [uid, client, name],
        );
        return d.length ? d[0] : null;
    }
    get_ehmeta(gid: number | bigint) {
        const d = this.db.query<[string]>(
            "SELECT data FROM ehmeta WHERE gid = ?;",
            [gid],
        );
        return d.length ? JSON.parse(d[0][0]) as GalleryMetadataSingle : null;
    }
    get_extended_pmeta(gid: number | bigint) {
        return this.convert_extended_pmeta(
            this.db.queryEntries<ExtendedPMetaRaw>(
                "SELECT pmeta.*, filemeta.is_nsfw, filemeta.is_ad FROM pmeta LEFT JOIN filemeta ON filemeta.token = pmeta.token WHERE gid = ?;",
                [gid],
            ),
        );
    }
    get_file(id: number | bigint) {
        const d = this.convert_file(this.db.queryEntries<EhFileRaw>(
            "SELECT * FROM file WHERE id = ?;",
            [id],
        ));
        return d.length ? d[0] : null;
    }
    get_filemeta(token: string) {
        const d = this.convert_filemeta(this.db.queryEntries<EhFileMetaRaw>(
            "SELECT * FROM filemeta WHERE token = ?;",
            [token],
        ));
        return d.length ? d[0] : null;
    }
    get_files(token: string) {
        return this.convert_file(this.db.queryEntries<EhFileRaw>(
            "SELECT * FROM file WHERE token = ?;",
            [token],
        ));
    }
    get_gallery_count() {
        return this.db.query<[number | bigint]>(
            "SELECT COUNT(*) FROM gmeta;",
        )[0][0];
    }
    get_gids(offset = 0, limit = 20) {
        return this.db.query<[number | bigint]>(
            "SELECT gid FROM gmeta LIMIT ? OFFSET ?;",
            [limit, offset],
        ).map((n) => n[0]);
    }
    get_gmetas(
        offset = 0,
        limit = 20,
        fields = "*",
        sort_by_gid: boolean | null = null,
        uploader: string | null = null,
        tag: string | null = null,
        category: string | null = null,
    ) {
        const sort_sql = sort_by_gid !== null
            ? ` ORDER BY gmeta.gid ${sort_by_gid ? "ASC" : "DESC"}`
            : "";
        "";
        const join_sqls = [];
        const where_sqls = [];
        const args = [];
        let escape = false;
        if (tag) {
            const tag_id = this.#tags.get(tag);
            if (tag_id !== undefined) {
                join_sqls.push("INNER JOIN gtag ON gmeta.gid = gtag.gid");
                where_sqls.push("gtag.id = ?");
                args.push(tag_id);
                escape = true;
            }
        }
        if (uploader) {
            where_sqls.push("uploader = ?");
            args.push(uploader);
        }
        if (category) {
            where_sqls.push("category = ?");
            args.push(category);
        }
        const where_sql = where_sqls.length
            ? ` WHERE ${where_sqls.join(" AND ")}`
            : "";
        const join_sql = join_sqls.length ? ` ${join_sqls.join(" ")}` : "";
        args.push(limit, offset);
        return this.convert_gmeta(
            this.db.queryEntries<GMetaRaw>(
                `SELECT ${
                    escape ? escape_fields(fields, "gmeta") : fields
                } FROM gmeta${join_sql}${where_sql}${sort_sql} LIMIT ? OFFSET ?;`,
                args,
            ),
        );
    }
    get_gmetas_all(
        fields = "*",
        sort_by_gid: boolean | null = null,
        uploader: string | null = null,
        tag: string | null = null,
        category: string | null = null,
    ) {
        const sort_sql = sort_by_gid !== null
            ? ` ORDER BY gmeta.gid ${sort_by_gid ? "ASC" : "DESC"}`
            : "";
        const join_sqls = [];
        const where_sqls = [];
        const args = [];
        let escape = false;
        if (tag) {
            const tag_id = this.#tags.get(tag);
            if (tag_id !== undefined) {
                join_sqls.push("INNER JOIN gtag ON gmeta.gid = gtag.gid");
                where_sqls.push("gtag.id = ?");
                args.push(tag_id);
                escape = true;
            }
        }
        if (uploader) {
            where_sqls.push("uploader = ?");
            args.push(uploader);
        }
        if (category) {
            where_sqls.push("category = ?");
            args.push(category);
        }
        const where_sql = where_sqls.length
            ? ` WHERE ${where_sqls.join(" AND ")}`
            : "";
        const join_sql = join_sqls.length ? ` ${join_sqls.join(" ")}` : "";
        return this.convert_gmeta(
            this.db.queryEntries<GMetaRaw>(
                `SELECT ${
                    escape ? escape_fields(fields, "gmeta") : fields
                } FROM gmeta${join_sql}${where_sql}${sort_sql};`,
                args,
            ),
        );
    }
    get_gmeta_by_gid(gid: number | bigint) {
        const s = this.convert_gmeta(
            this.db.queryEntries<GMetaRaw>(
                "SELECT * FROM gmeta WHERE gid = ?;",
                [gid],
            ),
        );
        return s.length ? s[0] : undefined;
    }
    get_gtags(gid: number | bigint) {
        return new Set(
            this.db.query<[string]>(
                "SELECT tag.tag FROM gtag INNER JOIN tag ON tag.id = gtag.id WHERE gid = ?;",
                [gid],
            ).map((v) => v[0]),
        );
    }
    get_gtags_full(gid: number | bigint) {
        return this.db.queryEntries<Tag>(
            "SELECT tag.* FROM gtag INNER JOIN tag ON tag.id = gtag.id WHERE gid = ?;",
            [gid],
        );
    }
    get_pmeta(gid: number | bigint) {
        return this.db.queryEntries<PMeta>(
            "SELECT * FROM pmeta WHERE gid = ?;",
            [gid],
        );
    }
    get_pmeta_by_index(gid: number | bigint, index: number | bigint) {
        const s = this.db.queryEntries<PMeta>(
            'SELECT * FROM pmeta WHERE gid = ? AND "index" = ?;',
            [gid, index],
        );
        return s.length ? s[0] : undefined;
    }
    get_pmeta_by_token(gid: number | bigint, token: string) {
        const s = this.db.queryEntries<PMeta>(
            "SELECT * FROM pmeta WHERE gid = ? AND token = ?;",
            [gid, token],
        );
        return s.length ? s[0] : undefined;
    }
    get_pmeta_by_token_only(token: string) {
        const s = this.db.queryEntries<PMeta>(
            "SELECT * FROM pmeta WHERE token = ?;",
            [token],
        );
        return s;
    }
    get_pmeta_count(gid: number | bigint) {
        return this.db.query<[number]>(
            "SELECT COUNT(*) FROM pmeta WHERE gid = ?;",
            [gid],
        )[0][0];
    }
    get_random_file(
        is_nsfw: boolean | null = null,
        is_ad: boolean | null = null,
        gids: Set<number> | null = null,
    ) {
        const args = [];
        let join_sql = "";
        const with_sql = [];
        const where_sql = [];
        if (gids) {
            const gids_sql = [];
            for (const gid of gids) {
                gids_sql.push("(?)");
                args.push(gid);
            }
            with_sql.push(`WITH gids AS (VALUES ${gids_sql.join(",")})`);
            join_sql += " INNER JOIN pmeta ON file.token = pmeta.token";
            where_sql.push("pmeta.gid IN gids");
        }
        if (is_nsfw !== null || is_ad !== null) {
            join_sql += " LEFT JOIN filemeta ON file.token = filemeta.token";
            if (is_nsfw !== null) {
                where_sql.push("IFNULL(filemeta.is_nsfw, 0) = ?");
                args.push(is_nsfw);
            }
            if (is_ad !== null) {
                where_sql.push("IFNULL(filemeta.is_ad, 0) = ?");
                args.push(is_ad);
            }
        }
        const wsql = where_sql.length
            ? ` WHERE ${where_sql.join(" AND ")}`
            : "";
        const wisql = with_sql.length ? `${with_sql.join(" ")} ` : "";
        const s = this.convert_file(
            this.db.queryEntries<EhFileRaw>(
                `${wisql}SELECT file.* FROM file${join_sql}${wsql} ORDER BY RANDOM() LIMIT 1;`,
                args,
            ),
        );
        return s.length ? s[0] : undefined;
    }
    get_tag(id: number | bigint) {
        const s = this.db.queryEntries<Tag>(
            "SELECT * FROM tag WHERE id = ?;",
            [id],
        );
        return s.length ? s[0] : undefined;
    }
    get_tag_by_tag(tag: string) {
        const s = this.db.queryEntries<Tag>(
            "SELECT * FROM tag WHERE tag = ?;",
            [tag],
        );
        return s.length ? s[0] : undefined;
    }
    get_tag_rows() {
        return this.db.queryEntries<Tag>(
            "SELECT * FROM tag WHERE tag LIKE ?;",
            ["rows:%"],
        );
    }
    async get_task(id: number | bigint) {
        const s = await this.transaction(() =>
            this.db.queryEntries<Task>("SELECT * FROM task WHERE id = ?;", [id])
        );
        return s.length ? s[0] : undefined;
    }
    get_tasks() {
        return this.transaction(() =>
            this.db.queryEntries<Task>("SELECT * FROM task;")
        );
    }
    get_tasks_by_pid(pid: number | bigint) {
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
    get_shared_token(token: string) {
        const s = this.convert_shared_token(
            this.db.queryEntries<SharedTokenRaw>(
                "SELECT * FROM shared_token WHERE token = ?;",
                [token],
            ),
        );
        return s.length ? s[0] : undefined;
    }
    get_token(token: string) {
        const s = this.convert_token(
            this.db.queryEntries<TokenRaw>(
                "SELECT * FROM token WHERE token = ?;",
                [token],
            ),
        );
        return s.length ? s[0] : undefined;
    }
    get_user(id: number | bigint) {
        const s = this.convert_user(
            this.db.queryEntries<UserRaw>(
                "SELECT * FROM user WHERE id = ?;",
                [id],
            ),
        );
        return s.length ? s[0] : undefined;
    }
    get_user_by_name(name: string) {
        const s = this.convert_user(
            this.db.queryEntries<UserRaw>(
                "SELECT * FROM user WHERE username = ?;",
                [name],
            ),
        );
        return s.length ? s[0] : undefined;
    }
    get_user_count() {
        return this.db.query<[number | bigint]>(
            "SELECT COUNT(*) FROM user;",
        )[0][0];
    }
    get_users(limit?: number, offset?: number) {
        let sql = "";
        const args = [];
        if (limit !== undefined) {
            sql += " LIMIT ?";
            args.push(limit);
        }
        if (offset !== undefined) {
            sql += " OFFSET ?";
            args.push(offset);
        }
        return this.convert_user(
            this.db.queryEntries<UserRaw>(`SELECT * FROM user${sql};`, args),
        );
    }
    list_client_configs(uid: number | bigint, client: string) {
        return this.db.queryEntries<ClientConfig>(
            "SELECT * FROM client_config WHERE uid = ? AND client = ?;",
            [uid, client],
        );
    }
    optimize() {
        this.db.execute("VACUUM;");
    }
    remove_expired_ehmeta(cache_time: number) {
        const date = new Date();
        date.setTime(date.getTime() - cache_time * 3600_000);
        this.db.query("DELETE FROM ehmeta WHERE cached_time < ?;", [date]);
    }
    remove_expired_token() {
        this.db.query("DELETE FROM token WHERE expired < ?;", [new Date()]);
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
    update_task(task: Task) {
        return this.transaction(() => {
            this.db.query("UPDATE task SET details = ? WHERE id = ?;", [
                task.details,
                task.id,
            ]);
        });
    }
    update_token(token: string, added: number): Token {
        this.db.query(
            "UPDATE token SET expired = ? WHERE token = ?;",
            [new Date(added + 2592000000), token],
        );
        const t = this.get_token(token);
        if (!t) throw Error("Failed to update token.");
        return t;
    }
    update_token_info(
        token: string,
        client: string | null,
        device: string | null,
        client_version: string | null,
        client_platform: string | null,
    ): Token {
        if (
            client !== null || device !== null || client_version !== null ||
            client_platform !== null
        ) {
            const args = [];
            const sets = [];
            if (client !== null) {
                sets.push("client = ?");
                args.push(client);
            }
            if (device !== null) {
                sets.push("device = ?");
                args.push(device);
            }
            if (client_version !== null) {
                sets.push("client_version = ?");
                args.push(client_version);
            }
            if (client_platform !== null) {
                sets.push("client_platform = ?");
                args.push(client_platform);
            }
            args.push(token);
            this.db.query(
                `UPDATE token SET ${sets.join(", ")} WHERE token = ?;`,
                args,
            );
        }
        const t = this.get_token(token);
        if (!t) throw Error("Failed to update token.");
        return t;
    }
    update_token_last_used(token: string) {
        this.db.query(
            "UPDATE token SET last_used = ? WHERE token = ?;",
            [new Date(), token],
        );
    }
    update_user(user: User) {
        this.db.query(
            "INSERT OR REPLACE INTO user VALUES (?, ?, ?, ?, ?);",
            [
                user.id,
                user.username,
                user.password,
                user.is_admin,
                user.permissions,
            ],
        );
    }
}
