import { assert } from "@std/assert";
import { Client } from "../client.ts";
import type { Config } from "../config.ts";
import type { EhDb, EhFile, PMeta } from "../db.ts";
import {
    Task,
    TaskDownloadProgess,
    TaskDownloadSingleProgress,
    TaskType,
} from "../task.ts";
import { TaskManager } from "../task_manager.ts";
import { calFileSha1, getHashFromUrl, RecoverableError } from "../utils.ts";
import {
    add_suffix_to_path,
    asyncEvery,
    asyncFilter,
    promiseState,
    PromiseStatus,
    sleep,
    sure_dir,
    TimeoutError,
} from "../utils.ts";
import { join, resolve } from "@std/path";
import { exists } from "@std/fs/exists";
import { ProgressReadable } from "../utils/progress_readable.ts";

export type DownloadConfig = {
    max_download_img_count?: number;
    mpv?: boolean;
    download_original_img?: boolean;
    max_retry_count?: number;
    remove_previous_gallery?: boolean;
    replaced_gallery?: { gid: number | bigint; token: string }[];
};

export const DEFAULT_DOWNLOAD_CONFIG: DownloadConfig = {};

const PROGRESS_UPDATE_INTERVAL = 200;

class DownloadManager {
    #abort: AbortSignal;
    #force_abort: AbortSignal;
    #max_download_count;
    #running_tasks: Promise<unknown>[];
    #progress: TaskDownloadProgess;
    #task: Task;
    #manager: TaskManager;
    #progress_changed: boolean;
    #last_send_progress: number;
    constructor(
        max_download_img_count: number,
        abort: AbortSignal,
        force_abort: AbortSignal,
        task: Task,
        manager: TaskManager,
    ) {
        this.#max_download_count = max_download_img_count;
        this.#running_tasks = [];
        this.#abort = abort;
        this.#force_abort = force_abort;
        this.#progress = {
            downloaded_page: 0,
            failed_page: 0,
            total_page: 0,
            downloaded_bytes: 0,
            started: Date.now(),
            details: [],
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
        if (this.#progress_changed) {
            const now = (new Date()).getTime();
            if (now >= this.#last_send_progress + PROGRESS_UPDATE_INTERVAL) {
                this.#manager.dispatchTaskProgressEvent(
                    TaskType.Download,
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
            TaskType.Download,
            this.#task.id,
            this.#progress,
        );
        this.#last_send_progress = now;
        this.#progress_changed = false;
        return re;
    }
    add_new_details(d: TaskDownloadSingleProgress) {
        const index = this.#progress.details.findIndex((v) =>
            v.index === d.index
        );
        if (index !== -1) {
            this.#progress.details[index] = d;
        } else {
            this.#progress.details.push(d);
        }
        this.#sendEvent();
    }
    async add_new_task<T>(f: () => Promise<T>) {
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
    remove_details(index: number) {
        this.#progress.details = this.#progress.details.filter((v) =>
            v.index !== index
        );
    }
    set_details_downloaded(index: number, downloaded: number) {
        const d = this.#progress.details.find((v) => v.index === index);
        if (d) {
            const num = downloaded - d.downloaded;
            const now = Date.now();
            this.#progress.downloaded_bytes += num;
            d.downloaded = downloaded;
            d.speed = now == d.last_updated ? 0 : num / (now - d.last_updated);
            d.last_updated = now;
        }
        this.#sendEvent();
    }
    set_details_started(index: number) {
        const d = this.#progress.details.find((v) => v.index === index);
        if (d) {
            d.started = (new Date()).getTime();
            d.last_updated = d.started;
        }
        this.#sendEvent();
    }
    set_details_total(index: number, total: number) {
        const d = this.#progress.details.find((v) => v.index === index);
        if (d) d.total = total;
        this.#sendEvent();
    }
    set_total_page(page: number) {
        this.#progress.total_page = page;
        this.#sendEvent();
    }
}

class HashError extends RecoverableError {
    constructor() {
        super("Hash error");
    }
}

interface Image {
    data: unknown;
    index: number;
    is_original: boolean | undefined;
    name: string;
    page_token: string;
    redirected_url: string | undefined;
    sampled_name: string;
    get_file(path: string): EhFile | undefined;
    get_original_file(path: string): EhFile | undefined;
    load(): Promise<void>;
    load_image(reload?: boolean): Promise<Response | undefined>;
    load_original_image(): Promise<Response | undefined>;
    to_pmeta(): PMeta | undefined;
}

export async function download_task(
    task: Task,
    client: Client,
    db: EhDb,
    cfg: Config,
    abort: AbortSignal,
    force_abort: AbortSignal,
    manager: TaskManager,
    dcfg: DownloadConfig,
) {
    console.log("Started to download gallery", task.gid);
    const gdatas = await client.fetchGalleryMetadataByAPI([
        task.gid,
        task.token,
    ]);
    const gdata = gdatas.map.get(BigInt(task.gid));
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
    const max_download_img_count = dcfg.max_download_img_count !== undefined
        ? dcfg.max_download_img_count
        : cfg.max_download_img_count;
    const m = new DownloadManager(
        max_download_img_count,
        abort,
        force_abort,
        task,
        manager,
    );
    const mpv_enabled = dcfg.mpv !== undefined ? dcfg.mpv : cfg.mpv;
    const download_original_img = dcfg.download_original_img !== undefined
        ? dcfg.download_original_img
        : cfg.download_original_img;
    const max_retry_count = dcfg.max_retry_count !== undefined
        ? dcfg.max_retry_count
        : cfg.max_retry_count;
    const remove_previous_gallery = dcfg.remove_previous_gallery !== undefined
        ? dcfg.remove_previous_gallery
        : cfg.remove_previous_gallery;
    const g = await client.fetchGalleryPage(task.gid, task.token);
    async function download_task(names: Record<string, number>, i: Image) {
        const ofiles = db.get_files(i.page_token);
        if (ofiles.length) {
            const need = await asyncEvery(
                ofiles,
                async (t) =>
                    (!t.is_original && download_original_img) ||
                    (!await exists(t.path)),
            );
            if (!need) {
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
                    } else {
                        const ops = db.get_pmeta_by_token_only(
                            i.page_token,
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
                console.log("Already download page", i.index);
                return;
            }
        }
        let load_times = 0;
        function load() {
            return new Promise<void>((resolve, reject) => {
                const errors: unknown[] = [];
                function try_load() {
                    if (load_times >= max_retry_count) reject(errors);
                    i.load().then(resolve).catch((e) => {
                        if (force_abort.aborted) {
                            console.log("Aborted when loading image:", i);
                            errors.push(e);
                            reject(errors);
                            return;
                        }
                        errors.push(e);
                        load_times += 1;
                        try_load();
                    });
                }
                try_load();
            });
        }
        async function deal_with_img() {
            assert(i.data);
            const pmeta = i.to_pmeta();
            if (pmeta) db.add_pmeta(pmeta);
            const download_original = download_original_img &&
                !i.is_original;
            const is_sampled = !download_original_img && !i.is_original;
            let path = resolve(
                join(base_path, is_sampled ? i.sampled_name : i.name),
            );
            if (names[i.name] > 1) {
                path = add_suffix_to_path(path, i.page_token);
                console.log("Changed path to", path);
            }
            const f = download_original
                ? i.get_original_file(path)
                : i.get_file(path);
            if (f === undefined) throw Error("Failed to get file.");
            m.add_new_details({
                downloaded: 0,
                height: Number(f.height),
                index: i.index,
                is_original: f.is_original,
                name: i.name,
                token: i.page_token,
                total: 0,
                width: Number(f.width),
                started: 0,
                speed: 0,
                last_updated: 0,
            });
            function download_img() {
                return new Promise<void>((resolve, reject) => {
                    async function download() {
                        const re = await (download_original
                            ? i.load_original_image()
                            : i.load_image());
                        if (re === undefined) {
                            throw Error("Failed to fetch image.");
                        }
                        m.set_details_started(i.index);
                        const len = re.headers.get("Content-Length");
                        if (len) {
                            const tmp = parseInt(len);
                            if (!isNaN(tmp)) {
                                m.set_details_total(i.index, tmp);
                            }
                        }
                        if (re.body === null) {
                            throw Error("Response don't have a body.");
                        }
                        const pr = new ProgressReadable(
                            re.body,
                            cfg.download_timeout,
                            cfg.download_timeout_check_interval,
                            force_abort,
                        );
                        pr.addEventListener("progress", (e) => {
                            m.set_details_downloaded(i.index, e.detail);
                        });
                        pr.addEventListener("finished", () => {
                            m.remove_details(i.index);
                        });
                        try {
                            const f = await Deno.open(path, {
                                create: true,
                                write: true,
                                truncate: true,
                            });
                            try {
                                await pr.readable.pipeTo(f.writable, {
                                    signal: pr.signal,
                                    preventClose: true,
                                });
                                if (pr.error) {
                                    throw (pr.error);
                                }
                            } finally {
                                try {
                                    f.close();
                                } catch (_) {
                                    null;
                                }
                            }
                        } catch (e) {
                            if (pr.is_timeout) {
                                throw new TimeoutError();
                            }
                            throw e;
                        } finally {
                            try {
                                pr.readable.cancel();
                            } catch (_) {
                                null;
                            }
                        }
                        if (manager.cfg.check_file_hash) {
                            const url = re.url;
                            const hash = getHashFromUrl(url);
                            const fhash = await calFileSha1(path);
                            if (hash != fhash) {
                                console.warn(
                                    `Hash not matched: file hash ${fhash}, original hash ${hash}, url ${url}`,
                                );
                                throw new HashError();
                            }
                        }
                    }
                    const errors: unknown[] = [];
                    function try_download(a: number) {
                        if (a >= max_retry_count) {
                            m.remove_details(i.index);
                            reject(errors);
                        }
                        download().then(resolve).catch((e) => {
                            if (force_abort.aborted) {
                                console.log(
                                    "Aborted when downloading image:",
                                    i,
                                );
                                errors.push(e);
                                reject(errors);
                                return;
                            }
                            if (e instanceof DOMException) {
                                if (e.name == "AbortError") {
                                    m.remove_details(i.index);
                                    reject(new TimeoutError());
                                    return;
                                }
                            }
                            if (
                                e instanceof TimeoutError ||
                                e instanceof HashError
                            ) {
                                m.remove_details(i.index);
                                reject(e);
                                return;
                            }
                            errors.push(e);
                            try_download(a + 1);
                        });
                    }
                    try_download(0);
                });
            }
            await download_img();
            db.add_file(f);
        }
        let retry = 0;
        function try_deal_with_img() {
            return new Promise((resolve, reject) => {
                function try_() {
                    load().then(() => {
                        deal_with_img().then(resolve).catch((e) => {
                            if (force_abort.aborted) {
                                reject(e);
                                return;
                            }
                            console.log("Failed to download, retry: ", e);
                            retry += 1;
                            if (retry >= max_retry_count) {
                                reject(e);
                                return;
                            }
                            const download_original = download_original_img &&
                                !i.is_original;
                            if (download_original) {
                                i.redirected_url = undefined;
                                try2_();
                            } else try_();
                        });
                    }).catch(reject);
                }
                function try2_() {
                    deal_with_img().then(resolve).catch((e) => {
                        console.log("Failed to download, retry: ", e);
                        retry += 1;
                        if (retry >= max_retry_count) {
                            reject(e);
                            return;
                        }
                        const download_original = download_original_img &&
                            !i.is_original;
                        if (download_original) {
                            i.redirected_url = undefined;
                            try2_();
                        } else try_();
                    });
                }
                try_();
            });
        }
        await try_deal_with_img();
        return;
    }
    if (mpv_enabled || g.mpv_enabled) {
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
                await download_task(names, i);
            });
        }
    } else {
        m.set_total_page(g.length);
        const imagelist = await g.imagelist;
        const names = imagelist.reduce(
            (acc: Record<string, number>, cur) => {
                const curr = cur.name;
                return acc[curr] ? ++acc[curr] : acc[curr] = 1, acc;
            },
            {},
        );
        for (const i of imagelist) {
            if (abort.aborted) break;
            await m.add_new_task(async () => {
                await download_task(names, i);
            });
        }
    }
    await m.join();
    if (m.has_failed_task) throw new RecoverableError("Some tasks failed.");
    if (abort.aborted || force_abort.aborted) throw Error("aborted");
    if (remove_previous_gallery && gmeta.first_gid && gmeta.first_key) {
        let replaced_gallery = dcfg.replaced_gallery;
        if (replaced_gallery === undefined) {
            const fg = await client.fetchGalleryPage(
                gmeta.first_gid,
                gmeta.first_key,
            );
            replaced_gallery = fg.new_version.filter((d) => d.gid < task.gid);
            replaced_gallery.push({
                gid: gmeta.first_gid,
                token: gmeta.first_key,
            });
        }
        replaced_gallery.forEach((g) => {
            const gmeta = db.get_gmeta_by_gid(g.gid);
            if (!gmeta) return;
            console.log("Remove gallery ", g.gid);
            if (manager.meilisearch) {
                manager.meilisearch.target.dispatchEvent(
                    new CustomEvent("gallery_remove", { detail: gmeta.gid }),
                );
            }
            db.delete_gallery(g.gid);
        });
    }
    return task;
}
