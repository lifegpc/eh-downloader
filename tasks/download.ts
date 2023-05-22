import { assert } from "std/testing/asserts.ts";
import { Client } from "../client.ts";
import { Config } from "../config.ts";
import { EhDb } from "../db.ts";
import { Task } from "../task.ts";
import {
    asyncFilter,
    promiseState,
    PromiseStatus,
    sleep,
    sure_dir,
} from "../utils.ts";
import { join, resolve } from "std/path/mod.ts";
import { exists } from "std/fs/exists.ts";

class DownloadManager {
    #max_download_count;
    #running_tasks: Promise<unknown>[];
    #has_failed_task = false;
    constructor(cfg: Config) {
        this.#max_download_count = cfg.max_download_img_count;
        this.#running_tasks = [];
    }
    async #check_tasks() {
        this.#running_tasks = await asyncFilter(
            this.#running_tasks,
            async (t) => {
                const s = await promiseState(t);
                if (s.status === PromiseStatus.Rejected) {
                    console.log(s.reason);
                    this.#has_failed_task = true;
                }
                return s.status === PromiseStatus.Pending;
            },
        );
    }
    async add_new_task(f: () => Promise<unknown>) {
        while (1) {
            await this.#check_tasks();
            if (this.#running_tasks.length < this.#max_download_count) {
                this.#running_tasks.push(f());
                break;
            }
            await sleep(10);
        }
    }
    get has_failed_task() {
        return this.#has_failed_task;
    }
    async join() {
        while (1) {
            await this.#check_tasks();
            if (!this.#running_tasks.length) break;
            await sleep(10);
        }
    }
}

export async function download_task(
    task: Task,
    client: Client,
    db: EhDb,
    cfg: Config,
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
    const base_path = join(cfg.base, task.gid.toString());
    await sure_dir(base_path);
    const m = new DownloadManager(cfg);
    if (cfg.mpv) {
        const mpv = await client.fetchMPVPage(task.gid, task.token);
        for (const i of mpv.imagelist) {
            await m.add_new_task(async () => {
                const ofiles = db.get_files(task.gid, i.page_token);
                if (ofiles.length) {
                    const t = ofiles[0];
                    if (
                        (t.is_original || !cfg.download_original_img) &&
                        (await exists(t.path))
                    ) {
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
                const path = resolve(join(base_path, i.name));
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
    return task;
}
