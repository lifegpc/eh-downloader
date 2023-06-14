import { assert } from "std/testing/asserts.ts";
import { Client } from "../client.ts";
import { Config } from "../config.ts";
import { EhDb } from "../db.ts";
import { Task, TaskDownloadProgess, TaskType } from "../task.ts";
import { TaskManager } from "../task_manager.ts";
import {
    add_suffix_to_path,
    asyncFilter,
    promiseState,
    PromiseStatus,
    sleep,
    sure_dir,
} from "../utils.ts";
import { join, resolve } from "std/path/mod.ts";
import { exists } from "std/fs/exists.ts";

class DownloadManager {
    #abort: AbortSignal;
    #force_abort: AbortSignal;
    #max_download_count;
    #running_tasks: Promise<unknown>[];
    #progress: TaskDownloadProgess;
    #task: Task;
    #manager: TaskManager;
    constructor(
        cfg: Config,
        abort: AbortSignal,
        force_abort: AbortSignal,
        task: Task,
        manager: TaskManager,
    ) {
        this.#max_download_count = cfg.max_download_img_count;
        this.#running_tasks = [];
        this.#abort = abort;
        this.#force_abort = force_abort;
        this.#progress = { downloaded_page: 0, failed_page: 0, total_page: 0 };
        this.#task = task;
        this.#manager = manager;
    }
    async #check_tasks() {
        this.#running_tasks = await asyncFilter(
            this.#running_tasks,
            async (t) => {
                const s = await promiseState(t);
                if (s.status === PromiseStatus.Rejected) {
                    if (!this.#force_abort.aborted) console.log(s.reason);
                    this.#progress.failed_page += 1;
                    this.#sendEvent();
                } else if (s.status === PromiseStatus.Fulfilled) {
                    this.#progress.downloaded_page += 1;
                    this.#sendEvent();
                }
                return s.status === PromiseStatus.Pending;
            },
        );
    }
    #sendEvent() {
        return this.#manager.dispatchTaskProgressEvent(
            TaskType.Download,
            this.#task.id,
            this.#progress,
        );
    }
    async add_new_task(f: () => Promise<unknown>) {
        while (1) {
            if (this.#abort.aborted) break;
            await this.#check_tasks();
            if (this.#running_tasks.length < this.#max_download_count) {
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

export async function download_task(
    task: Task,
    client: Client,
    db: EhDb,
    cfg: Config,
    abort: AbortSignal,
    force_abort: AbortSignal,
    manager: TaskManager,
) {
    console.log("Started to download gallery", task.gid);
    const gdatas = await client.fetchGalleryMetadataByAPI([
        task.gid,
        task.token,
    ]);
    const gdata = gdatas.map.get(task.gid);
    if (gdata === undefined) throw Error("Gallery metadata not included.");
    if (typeof gdata === "string") throw Error(gdata);
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
    const m = new DownloadManager(cfg, abort, force_abort, task, manager);
    if (cfg.mpv) {
        const mpv = await client.fetchMPVPage(task.gid, task.token);
        m.set_total_page(mpv.pagecount);
        const names = mpv.imagelist.reduce(
            (acc: Record<string, number>, cur) => {
                const curr = cur.name;
                return acc[curr] ? ++acc[curr] : acc[curr] = 1, acc;
            },
            {},
        );
        for (const i of mpv.imagelist) {
            if (abort.aborted) break;
            await m.add_new_task(async () => {
                const ofiles = db.get_files(task.gid, i.page_token);
                if (ofiles.length) {
                    const t = ofiles[0];
                    if (
                        (t.is_original || !cfg.download_original_img) &&
                        (await exists(t.path))
                    ) {
                        const p = db.get_pmeta_by_index(task.gid, i.index);
                        if (!p) {
                            const op = db.get_pmeta_by_token(
                                task.gid,
                                i.page_token,
                            );
                            if (op) {
                                op.index = i.index;
                                op.name = i.name;
                                db.add_pmeta(op);
                                return;
                            }
                        }
                        console.log("Already download page", i.index);
                        return;
                    }
                }
                function load() {
                    return new Promise<void>((resolve, reject) => {
                        const errors: unknown[] = [];
                        function try_load(a: number) {
                            if (a >= cfg.max_retry_count) reject(errors);
                            i.load().then(resolve).catch((e) => {
                                if (force_abort.aborted) {
                                    throw Error("aborted.");
                                }
                                errors.push(e);
                                try_load(a + 1);
                            });
                        }
                        try_load(0);
                    });
                }
                await load();
                assert(i.data);
                const pmeta = i.to_pmeta();
                if (pmeta) db.add_pmeta(pmeta);
                const download_original = cfg.download_original_img &&
                    !i.is_original;
                if (download_original) console.log(i.index, i.data.o);
                let path = resolve(join(base_path, i.name));
                if (names[i.name] > 1) {
                    path = add_suffix_to_path(path, i.page_token);
                    console.log("Changed path to", path);
                }
                function download_img() {
                    return new Promise<void>((resolve, reject) => {
                        async function download() {
                            const re = await (download_original
                                ? i.load_original_image()
                                : i.load_image());
                            if (re === undefined) {
                                throw Error("Failed to fetch image.");
                            }
                            if (re.body === null) {
                                throw Error("Response don't have a body.");
                            }
                            const f = await Deno.open(path, {
                                create: true,
                                write: true,
                                truncate: true,
                            });
                            try {
                                await re.body.pipeTo(f.writable, {
                                    signal: force_abort,
                                    preventClose: true,
                                });
                            } finally {
                                try {
                                    f.close();
                                } catch (_) {
                                    null;
                                }
                            }
                        }
                        const errors: unknown[] = [];
                        function try_download(a: number) {
                            if (a >= cfg.max_retry_count) {
                                reject(errors);
                            }
                            download().then(resolve).catch((e) => {
                                if (force_abort.aborted) {
                                    throw Error("aborted.");
                                }
                                errors.push(e);
                                try_download(a + 1);
                            });
                        }
                        try_download(0);
                    });
                }
                await download_img();
                const f = download_original
                    ? i.get_original_file(path)
                    : i.get_file(path);
                if (f === undefined) throw Error("Failed to get file.");
                db.add_file(f);
                return;
            });
        }
    }
    await m.join();
    if (m.has_failed_task) throw Error("Some tasks failed.");
    if (abort.aborted || force_abort.aborted) throw Error("aborted");
    return task;
}
