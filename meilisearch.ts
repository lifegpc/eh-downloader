import {
    EnqueuedTask,
    Index,
    MeiliSearch,
    MeiliSearchApiError,
} from "meilisearch";
import { sleep } from "./utils.ts";
import { EhDb } from "./db.ts";
import isEqual from "lodash/isEqual";

const GMetaSettings: Record<string, unknown> = {
    displayedAttributes: ["*"],
    searchableAttributes: [
        "title",
        "title_jpn",
        "uploader",
        "tags.tag",
        "tags.translated",
    ],
    filterableAttributes: [
        "category",
        "expunged",
        "filecount",
        "filesize",
        "gid",
        "posted",
        "rating",
        "tags.id",
        "tags.tag",
        "tags.translated",
        "uploader",
    ],
    sortableAttributes: ["filecount", "filesize", "gid", "posted", "rating"],
};

export class MeiliSearchServer {
    client;
    db;
    handle;
    handle2;
    #gmeta?: Index;
    #inited = false;
    target;
    constructor(host: string, api_key: string, db: EhDb, signal?: AbortSignal) {
        this.client = new MeiliSearch({
            host,
            apiKey: api_key,
            requestConfig: { signal },
        });
        this.db = db;
        this.handle = (e: Event) => {
            this.#gallery_update(e);
        };
        this.handle2 = (e: Event) => {
            this.#gallery_remove(e);
        };
        this.target = new EventTarget();
        this.target.addEventListener("gallery_update", this.handle);
        this.target.addEventListener("gallery_remove", this.handle2);
    }
    #gallery_remove(e: Event) {
        const ev = e as CustomEvent<number>;
        this.removeGallery(ev.detail).catch((e) => {
            console.log(e);
        });
    }
    #gallery_update(e: Event) {
        const ev = e as CustomEvent<number>;
        this.updateGallery(ev.detail).catch((e) => {
            console.log(e);
        });
    }
    async #updateGMetaSettings() {
        if (this.#gmeta) {
            const o: Record<string, unknown> = await this.#gmeta.getSettings();
            const u: Record<string, unknown> = {};
            let need_update = false;
            Object.getOwnPropertyNames(GMetaSettings).forEach((k) => {
                if (!isEqual(o[k], GMetaSettings[k])) {
                    u[k] = GMetaSettings[k];
                    need_update = true;
                }
            });
            if (need_update) {
                console.log(u);
                await this.waitTask(this.#gmeta.updateSettings(u));
            }
        }
    }
    close() {
        this.target.removeEventListener("gallery_update", this.handle);
        this.target.removeEventListener("gallery_remove", this.handle2);
    }
    async getIndex(uid: string, primaryKey?: string) {
        try {
            return await this.client.getIndex(uid);
        } catch (e) {
            if (e instanceof MeiliSearchApiError) {
                if (e.code === "index_not_found") {
                    await this.waitTask(
                        this.client.createIndex(uid, { primaryKey }),
                    );
                    return await this.client.getIndex(uid);
                }
            }
            throw e;
        }
    }
    get gmeta(): Promise<Index> {
        return new Promise((resolve, reject) => {
            const check = () => {
                if (!this.#gmeta) reject(new Error("gmeta not found."));
                else resolve(this.#gmeta);
            };
            if (!this.#inited) {
                this.init().then(check).catch(reject);
            } else {
                check();
            }
        });
    }
    async init() {
        this.#gmeta = await this.getIndex("gmeta", "gid");
        this.#updateGMetaSettings();
        this.#inited = true;
    }
    async removeGallery(gid: number) {
        const gmeta = await this.gmeta;
        await this.waitTask(gmeta.deleteDocument(gid));
    }
    async updateGallery(...gids: number[]) {
        const gmeta = await this.gmeta;
        const datas = gids.map((gid) => {
            const d = this.db.get_gmeta_by_gid(gid);
            if (!d) throw Error("Gallery not found.");
            const e = <Record<string, unknown>> d;
            e.tags = this.db.get_gtags_full(gid);
            return e;
        });
        await this.waitTask(gmeta.updateDocuments(datas));
    }
    async waitTask(task: EnqueuedTask | Promise<EnqueuedTask>) {
        if (task instanceof Promise) {
            task = await task;
        }
        let status = await this.client.getTask(task.taskUid);
        while (status.status === "enqueued" || status.status === "processing") {
            await sleep(100);
            status = await this.client.getTask(task.taskUid);
        }
        if (status.status === "failed") {
            throw status.error ? status.error : new Error("Task failed.");
        }
        return status;
    }
}
