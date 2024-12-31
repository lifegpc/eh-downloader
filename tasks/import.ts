// deno-lint-ignore-file no-inner-declarations
import { Task, TaskImportProgress, TaskType } from "../task.ts";
import { TaskManager } from "../task_manager.ts";
import {
    add_suffix_to_path,
    asyncEvery,
    asyncFilter,
    calFileSha1,
    promiseState,
    PromiseStatus,
    RecoverableError,
    sleep,
    sure_dir,
} from "../utils.ts";
import { exists } from "@std/fs/exists";
import { walk } from "@std/fs/walk";
import { extname, join, relative } from "@std/path";
import { ImportMethod, ImportSize } from "../config.ts";
import { fb_get_size } from "../thumbnail/ffmpeg_binary.ts";
import { EhFile, PMeta } from "../db.ts";
import type { ReadonlyZip } from "../utils/readonly_zip.ts";
import { base_logger } from "../utils/logger.ts";

export type ImportConfig = {
    max_import_img_count?: number;
    mpv?: boolean;
    method?: ImportMethod;
    remove_previous_gallery?: boolean;
    replaced_gallery?: { gid: number | bigint; token: string }[];
    import_path: string;
    size: ImportSize;
};

interface Page {
    index: number;
    token: string;
    name: string;
    sampled_name: string;
}

const VALID_EXTS = [".jpg", ".png", ".gif"];

const PROGRESS_UPDATE_INTERVAL = 200;

const logger = base_logger.get_logger("import-task");

class ImportManager {
    #abort: AbortSignal;
    #force_abort: AbortSignal;
    #max_import_count;
    #running_tasks: Promise<unknown>[];
    #progress: TaskImportProgress;
    #task: Task;
    #manager: TaskManager;
    #progress_changed: boolean;
    #last_send_progress: number;
    constructor(
        max_import_img_count: number,
        abort: AbortSignal,
        force_abort: AbortSignal,
        task: Task,
        manager: TaskManager,
    ) {
        this.#max_import_count = max_import_img_count;
        this.#running_tasks = [];
        this.#abort = abort;
        this.#force_abort = force_abort;
        this.#progress = {
            imported_page: 0,
            failed_page: 0,
            total_page: 0,
        };
        this.#task = task;
        this.#manager = manager;
        this.#progress_changed = false;
        this.#last_send_progress = -1;
    }
    async #check_tasks() {
        this.#running_tasks = await asyncFilter(
            this.#running_tasks,
            async (t) => {
                const s = await promiseState(t);
                if (s.status === PromiseStatus.Rejected) {
                    if (!this.#force_abort.aborted) logger.log(s.reason);
                    this.#progress.failed_page += 1;
                    this.#sendEvent();
                } else if (s.status === PromiseStatus.Fulfilled) {
                    this.#progress.imported_page += 1;
                    this.#sendEvent();
                }
                return s.status === PromiseStatus.Pending;
            },
        );
        if (this.#progress_changed) {
            const now = (new Date()).getTime();
            if (now >= this.#last_send_progress + PROGRESS_UPDATE_INTERVAL) {
                this.#manager.dispatchTaskProgressEvent(
                    TaskType.Import,
                    this.#task.id,
                    this.#progress,
                );
                this.#progress_changed = false;
                this.#last_send_progress = now;
            }
        }
    }
    #sendEvent() {
        this.#progress_changed = true;
        const now = (new Date()).getTime();
        if (now < this.#last_send_progress + PROGRESS_UPDATE_INTERVAL) return;
        const re = this.#manager.dispatchTaskProgressEvent(
            TaskType.Import,
            this.#task.id,
            this.#progress,
        );
        this.#last_send_progress = now;
        this.#progress_changed = false;
        return re;
    }
    async add_new_task<T>(f: () => Promise<T>) {
        while (1) {
            if (this.#abort.aborted) break;
            await this.#check_tasks();
            if (this.#running_tasks.length < this.#max_import_count) {
                this.#running_tasks.push(f());
                break;
            }
            await sleep(10);
        }
    }
    get has_failed_task() {
        return this.#progress.failed_page > 0;
    }
    async join() {
        while (1) {
            await this.#check_tasks();
            if (!this.#running_tasks.length) break;
            await sleep(10);
        }
    }
    set_total_page(page: number) {
        this.#progress.total_page = page;
        this.#sendEvent();
    }
}

class FileLoader {
    #path;
    #zip?: ReadonlyZip;
    #files: string[] = [];
    #inited = false;
    #filecount;
    #has_prefix = false;
    #closed = false;
    constructor(path: string, filecount: number) {
        this.#path = path;
        this.#filecount = filecount;
    }
    #check() {
        if (!this.#inited) throw Error("FileLoader not initiailzed.");
        if (this.#closed) throw Error("Already closed.");
    }
    #get_file(name: string) {
        if (this.#files.includes(name)) {
            return join(this.#path, name);
        }
    }
    #get_zip(name: string) {
        if (this.#files.includes(name)) {
            return name;
        }
    }
    close() {
        if (this.#closed) return;
        this.#closed = true;
        this.#zip?.close();
    }
    get_file(name: string, index: number) {
        this.#check();
        if (this.#has_prefix) {
            name = `${
                index.toString().padStart(
                    this.#filecount.toString().length,
                    "0",
                )
            }_${name}`;
        }
        let t = this.#get_file(name);
        if (t) return t;
        const ext = extname(name).toLowerCase();
        if (ext != ".jpg") {
            const n = name.slice(0, name.length - 4) + ".jpg";
            t = this.#get_file(n);
            if (t) return t;
        }
    }
    get_zip(name: string, index: number) {
        this.#check();
        if (this.#has_prefix) {
            name = `${
                index.toString().padStart(
                    this.#filecount.toString().length,
                    "0",
                )
            }_${name}`;
        }
        let t = this.#get_zip(name);
        if (t) return t;
        const ext = extname(name).toLowerCase();
        if (ext != ".jpg") {
            const n = name.slice(0, name.length - 4) + ".jpg";
            t = this.#get_zip(n);
            if (t) return t;
        }
    }
    async init() {
        if (await exists(this.#path, { isDirectory: true })) {
            for await (const i of walk(this.#path)) {
                if (i.path != this.#path) {
                    this.#files.push(relative(this.#path, i.path));
                }
            }
        } else {
            const z = await import("../utils/readonly_zip.ts");
            this.#zip = new z.ReadonlyZip(this.#path);
            const count = this.#zip.count;
            for (let i = 0n; i < count; i++) {
                const f = this.#zip.get_name(i);
                if (f) {
                    this.#files.push(f);
                }
            }
        }
        let has_prefix = true;
        const re = new RegExp(`^\\d{${this.#filecount.toString().length}}_`);
        for (const f of this.#files) {
            const ext = extname(f).toLowerCase();
            if (!VALID_EXTS.includes(ext)) {
                continue;
            }
            if (!f.match(re)) {
                has_prefix = false;
                break;
            }
        }
        this.#has_prefix = has_prefix;
        this.#inited = true;
        this.#closed = false;
        return this;
    }
    get is_zip() {
        this.#check();
        return this.#zip !== undefined;
    }
    open_zip_file(name: string) {
        if (this.#files.includes(name)) {
            const s = this.#zip!.open(name);
            if (typeof s === "string") {
                throw Error(`Failed to open file: ${s}`);
            }
            return s;
        }
    }
}

export async function import_task(task: Task, manager: TaskManager) {
    if (!task.details) throw Error("Task details are needed.");
    logger.log("Started to import gallery", task.gid);
    const icfg: ImportConfig = JSON.parse(task.details);
    const cfg = manager.cfg;
    const client = manager.client;
    const db = manager.db;
    const gdatas = await client.fetchGalleryMetadataByAPI([
        task.gid,
        task.token,
    ]);
    const gdata = gdatas.map.get(BigInt(task.gid));
    if (gdata === undefined) throw Error("Gallery metadata not included.");
    if (typeof gdata === "string") throw Error(gdata);
    const f =
        await (new FileLoader(icfg.import_path, parseInt(gdata.filecount)))
            .init();
    try {
        const gmeta = gdatas.convert(gdata);
        db.add_gmeta(gmeta);
        await db.add_gtag(task.gid, new Set(gdata.tags));
        if (manager.meilisearch) {
            manager.meilisearch.target.dispatchEvent(
                new CustomEvent("gallery_update", { detail: gmeta.gid }),
            );
        }
        const base_path = join(cfg.base, task.gid.toString());
        await sure_dir(base_path);
        let mpv_enabled = icfg.mpv ?? cfg.mpv;
        let import_method = icfg.method ?? cfg.import_method;
        if (
            f.is_zip && import_method != ImportMethod.Copy &&
            import_method != ImportMethod.CopyThenDelete
        ) {
            import_method = ImportMethod.CopyThenDelete;
        }
        const max_import_img_count = icfg.max_import_img_count ??
            cfg.max_import_img_count;
        let imgs: Page[] = [];
        const m = new ImportManager(
            max_import_img_count,
            manager.aborts,
            manager.force_aborts,
            task,
            manager,
        );
        if (!mpv_enabled) {
            const g = await client.fetchGalleryPage(task.gid, task.token);
            if (g.mpv_enabled) {
                mpv_enabled = true;
            } else {
                imgs = await g.imagelist;
                m.set_total_page(g.length);
            }
        }
        if (mpv_enabled) {
            const g = await client.fetchMPVPage(task.gid, task.token);
            imgs = g.imagelist;
            m.set_total_page(g.pagecount);
        }
        const names = imgs.reduce(
            (acc: Record<string, number>, cur) => {
                const curr = cur.name;
                return acc[curr] ? ++acc[curr] : acc[curr] = 1, acc;
            },
            {},
        );

        async function import_img(i: Page) {
            const opath = f.get_file(i.name, i.index);
            if (!opath) {
                logger.log("File not found");
                return;
            }
            const size = await fb_get_size(opath);
            if (!size) {
                logger.log("Failed to get file size for", opath);
                throw Error("Failed to get file size.");
            }
            const ofiles = db.get_files(i.token);
            if (ofiles.length) {
                const need = await asyncEvery(
                    ofiles,
                    async (t) =>
                        (!t.is_original && t.height != size.height &&
                            t.width != size.width) || (!await exists(t.path)),
                );
                if (!need) {
                    const p = db.get_pmeta_by_index(task.gid, i.index);
                    if (!p) {
                        const op = db.get_pmeta_by_token(
                            task.gid,
                            i.token,
                        );
                        if (op) {
                            op.index = i.index;
                            op.name = i.name;
                            db.add_pmeta(op);
                            return;
                        } else {
                            const ops = db.get_pmeta_by_token_only(
                                i.token,
                            );
                            if (ops.length) {
                                const op = ops[0];
                                op.gid = task.gid;
                                op.index = i.index;
                                op.name = i.name;
                                db.add_pmeta(op);
                                return;
                            }
                        }
                    }
                    logger.log("Already has page", i.index);
                    return;
                }
            }
            const pmeta: PMeta = {
                gid: task.gid,
                height: size.height,
                width: size.width,
                index: i.index,
                name: i.name,
                token: i.token,
            };
            db.add_pmeta(pmeta);
            const oriext = extname(i.name).toLowerCase();
            const nowext = extname(opath).toLowerCase();
            const is_original = icfg.size == ImportSize.Original ||
                (oriext != ".jpg" && oriext == nowext) ||
                (oriext == nowext && size.width < icfg.size);
            let path = join(base_path, is_original ? i.name : i.sampled_name);
            if (import_method != ImportMethod.Keep && names[i.name] > 1) {
                path = add_suffix_to_path(path, i.token);
                logger.debug("Changed path to", path);
            }
            if (import_method == ImportMethod.Move) {
                await Deno.rename(opath, path);
            } else if (import_method != ImportMethod.Keep) {
                await Deno.copyFile(opath, path);
            } else {
                path = opath;
            }
            if (cfg.check_file_hash && is_original) {
                const sha = await calFileSha1(path);
                if (sha.slice(0, i.token.length) != i.token) {
                    logger.warn(
                        `Hash not matched: file hash ${sha}, token ${i.token}`,
                    );
                    return;
                }
            }
            if (import_method == ImportMethod.CopyThenDelete) {
                await Deno.remove(opath);
            }
            const file: EhFile = {
                height: size.height,
                width: size.width,
                is_original,
                id: 0,
                path,
                token: i.token,
            };
            db.add_file(file);
        }

        async function import_zip_img(i: Page) {
            const opath = f.get_zip(i.name, i.index);
            if (!opath) {
                logger.log("File not found");
                return;
            }
            const ofiles = db.get_files(i.token);
            if (ofiles.length) {
                const need = await asyncEvery(
                    ofiles,
                    async (t) =>
                        !t.is_original && icfg.size === ImportSize.Original ||
                        (!await exists(t.path)),
                );
                if (!need) {
                    const p = db.get_pmeta_by_index(task.gid, i.index);
                    if (!p) {
                        const op = db.get_pmeta_by_token(
                            task.gid,
                            i.token,
                        );
                        if (op) {
                            op.index = i.index;
                            op.name = i.name;
                            db.add_pmeta(op);
                            return;
                        } else {
                            const ops = db.get_pmeta_by_token_only(
                                i.token,
                            );
                            if (ops.length) {
                                const op = ops[0];
                                op.gid = task.gid;
                                op.index = i.index;
                                op.name = i.name;
                                db.add_pmeta(op);
                                return;
                            }
                        }
                    }
                    logger.log("Already has page", i.index);
                    return;
                }
            }
            const oriext = extname(i.name).toLowerCase();
            const nowext = extname(opath).toLowerCase();
            let path = join(
                base_path,
                i.name.replace(oriext, nowext),
            );
            if (names[i.name] > 1) {
                path = add_suffix_to_path(path, i.token);
                logger.log("Changed path to", path);
            }
            const zf = f.open_zip_file(opath);
            if (!zf) {
                logger.log("File not found");
                return;
            }
            try {
                const out = await Deno.open(path, {
                    create: true,
                    write: true,
                });
                try {
                    const buf = new Uint8Array(65536);
                    let len = zf.read(buf);
                    while (len > 0) {
                        await out.write(buf.slice(0, Number(len)));
                        len = zf.read(buf);
                    }
                } finally {
                    out.close();
                }
            } finally {
                zf.close();
            }
            const size = await fb_get_size(path);
            if (!size) {
                logger.error("Failed to get file size for", path);
                throw Error("Failed to get file size.");
            }
            const is_original = icfg.size == ImportSize.Original ||
                (oriext != ".jpg" && oriext == nowext) ||
                (oriext == nowext && size.width < icfg.size);
            if (cfg.check_file_hash && is_original) {
                const sha = await calFileSha1(path);
                if (sha.slice(0, i.token.length) != i.token) {
                    logger.warn(
                        `Hash not matched: file hash ${sha}, token ${i.token}`,
                    );
                    return;
                }
            }
            const pmeta: PMeta = {
                gid: task.gid,
                height: size.height,
                width: size.width,
                index: i.index,
                name: i.name,
                token: i.token,
            };
            db.add_pmeta(pmeta);
            const file: EhFile = {
                height: size.height,
                width: size.width,
                is_original,
                id: 0,
                path,
                token: i.token,
            };
            db.add_file(file);
        }

        for (const i of imgs) {
            if (manager.aborted) break;
            await m.add_new_task(async () => {
                if (f.is_zip) await import_zip_img(i);
                else await import_img(i);
            });
        }
        await m.join();
        const remove_previous_gallery = icfg.remove_previous_gallery ??
            cfg.remove_previous_gallery;
        if (m.has_failed_task) throw new RecoverableError("Some tasks failed.");
        if (manager.aborted || manager.force_aborted) throw Error("aborted");
        if (f.is_zip && import_method == ImportMethod.CopyThenDelete) {
            f.close();
            await Deno.remove(icfg.import_path);
        }
        if (remove_previous_gallery && gmeta.first_gid && gmeta.first_key) {
            let replaced_gallery = icfg.replaced_gallery;
            if (replaced_gallery === undefined) {
                const fg = await client.fetchGalleryPage(
                    gmeta.first_gid,
                    gmeta.first_key,
                );
                replaced_gallery = fg.new_version.filter((d) =>
                    d.gid < task.gid
                );
                replaced_gallery.push({
                    gid: gmeta.first_gid,
                    token: gmeta.first_key,
                });
            }
            replaced_gallery.forEach((g) => {
                const gmeta = db.get_gmeta_by_gid(g.gid);
                if (!gmeta) return;
                logger.debug("Remove gallery ", g.gid);
                if (manager.meilisearch) {
                    manager.meilisearch.target.dispatchEvent(
                        new CustomEvent("gallery_remove", {
                            detail: gmeta.gid,
                        }),
                    );
                }
                db.delete_gallery(g.gid);
            });
        }
        return task;
    } finally {
        f.close();
    }
}
