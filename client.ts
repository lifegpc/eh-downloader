import { Config } from "./config.ts";
import { load_gallery_metadata } from "./page/GalleryMetadata.ts";
import { load_gallery_page } from "./page/GalleryPage.ts";
import { load_mpv_page } from "./page/MPVPage.ts";
import { load_single_page } from "./page/SinglePage.ts";

export type GID = [number, string];

export class Client {
    cookies;
    host;
    ua;
    signal;
    constructor(cfg: Config, signal?: AbortSignal) {
        this.cookies = cfg.cookies;
        this.ua = cfg.ua ||
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36";
        this.host = cfg.ex ? "exhentai.org" : "e-hentai.org";
        this.signal = signal;
    }
    get(
        url: string | Request | URL,
        options: RequestInit | undefined = undefined,
    ) {
        return this.request(url, "GET", options);
    }
    post(
        url: string | Request | URL,
        options: RequestInit | undefined = undefined,
    ) {
        return this.request(url, "POST", options);
    }
    is_eh(hostname: string) {
        return hostname == "e-hentai.org" || hostname == "exhentai.org" ||
            hostname.endsWith(".e-hentai.org") ||
            hostname.endsWith(".exhentai.org");
    }
    async redirect(url: string) {
        const re = await this.get(url, { redirect: "manual" });
        if (re.status == 301 || re.status == 302) {
            const t = re.headers.get("location");
            re.body?.cancel();
            return t ? t : undefined;
        } else return undefined;
    }
    request(
        url: string | Request | URL,
        method: string | undefined = undefined,
        options: RequestInit | undefined = undefined,
    ) {
        const headers = new Headers();
        headers.set("User-Agent", this.ua);
        if (this.cookies) {
            if (typeof url === "string") {
                const u = new URL(url);
                if (this.is_eh(u.hostname)) {
                    headers.set("Cookie", this.cookies);
                }
            } else if (url instanceof Request) {
                const u = new URL(url.url);
                if (this.is_eh(u.hostname)) {
                    headers.set("Cookie", this.cookies);
                }
            } else if (url instanceof URL) {
                if (this.is_eh(url.hostname)) {
                    headers.set("Cookie", this.cookies);
                }
            }
        }
        if (url instanceof Request) {
            for (const v of headers) {
                url.headers.set(v[0], v[1]);
            }
            return fetch(url);
        } else {
            const d = Object.assign({ method: method || "GET" }, options);
            if (d.headers) {
                const nheaders = new Headers(d.headers);
                for (const v of headers) {
                    nheaders.set(v[0], v[1]);
                }
                d.headers = nheaders;
            } else {
                d.headers = headers;
            }
            if (!d.signal && this.signal) {
                d.signal = this.signal;
            }
            return fetch(url, d);
        }
    }
    /**
     * Fetch a single page (use HTML)
     * @param gid Gallery ID
     * @param page_token Page token
     * @param index Page index
     * @param nl Reload token
     * @returns
     */
    async fetchSignlePage(
        gid: number,
        page_token: string,
        index: number,
        nl?: string,
    ) {
        const p = nl ? `?nl=${nl}` : "";
        const url = `https://${this.host}/s/${page_token}/${gid}-${index}${p}`;
        const re = await this.get(url);
        if (re.status != 200) {
            throw new Error(
                `Fetch ${url} failed, status ${re.status} ${re.statusText}`,
            );
        }
        return load_single_page(await re.text(), this);
    }
    /**
     * Fetch metadata via API
     * @param gids A list of Gallery ID and token
     * @returns
     */
    async fetchGalleryMetadataByAPI(...gids: GID[]) {
        if (gids.length > 25) throw Error("Load limiting is reached.");
        const data = { method: "gdata", gidlist: gids, namespace: 1 };
        const re = await this.post(`https://${this.host}/api.php`, {
            body: JSON.stringify(data),
            headers: { "content-type": "application/json" },
        });
        if (re.status != 200) {
            throw new Error(
                `Fetch api.php failed, status ${re.status} ${re.statusText}`,
            );
        }
        return load_gallery_metadata(await re.text());
    }
    /**
     * Fetch a gallery page (use HTML)
     * @param gid Gallery ID
     * @param token Token
     * @param page Page number
     * @returns
     */
    async fetchGalleryPage(gid: number, token: string, page?: number) {
        let url = `https://${this.host}/g/${gid}/${token}/`;
        if (page) url += `?p=${page}`;
        const re = await this.get(url);
        if (re.status != 200) {
            throw new Error(
                `Fetch ${url} failed, status ${re.status} ${re.statusText}`,
            );
        }
        return load_gallery_page(await re.text(), this);
    }
    /**
     * Fetch a Multi-Page Viewer page
     * @param gid Gallery ID
     * @param token Token
     * @returns
     */
    async fetchMPVPage(gid: number, token: string) {
        const url = `https://${this.host}/mpv/${gid}/${token}/`;
        const re = await this.get(url);
        if (re.status != 200) {
            throw new Error(
                `Fetch ${url} failed, status ${re.status} ${re.statusText}`,
            );
        }
        return load_mpv_page(await re.text(), this);
    }
}
