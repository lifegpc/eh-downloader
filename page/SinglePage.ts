import { DOMParser } from "deno_dom/deno-dom-wasm-noinit.ts";
import { Client } from "../client.ts";
import { initDOMParser } from "../utils.ts";

class SinglePage {
    dom;
    doc;
    client;
    _meta: string | undefined;
    _gid: number | undefined;
    constructor(html: string, client: Client) {
        const dom = (new DOMParser()).parseFromString(html, "text/html");
        if (!dom) {
            throw Error("Failed to parse HTML document.");
        }
        this.dom = dom;
        const doc = this.dom.documentElement;
        if (!doc) {
            throw Error("HTML document don't have a document element.");
        }
        this.doc = doc;
        this.client = client;
        this._meta = undefined;
        this._gid = undefined;
    }
    async load_image(url: string) {
        const re = await this.client.get(url);
        if (re.status != 200) {
            throw new Error(
                `Fetch ${url} failed, status ${re.status} ${re.statusText}`,
            );
        }
        return new SinglePage(await re.text(), this.client);
    }
    get currentIndex() {
        const span = this.doc.querySelector("#i2>div span");
        if (!span) throw Error("Can not find currentIndex.");
        return parseInt(span.innerHTML);
    }
    get gid() {
        if (this._gid === undefined) {
            this._gid = eval(`${this.meta};gid`);
            if (typeof this._gid != "number") throw Error("Unknown gid");
        }
        return this._gid;
    }
    get img_url() {
        const img = this.doc.querySelector("#img");
        if (!img) throw Error("Unknown image url.");
        const url = img.getAttribute("src");
        if (!url) throw Error("Unknown image url.");
        return url;
    }
    get meta() {
        if (this._meta === undefined) {
            const scripts = this.doc.getElementsByTagName("script");
            for (const script of scripts) {
                if (script.innerHTML.startsWith("var")) {
                    this._meta = script.innerHTML;
                    break;
                }
            }
        }
        return this._meta;
    }
    async nextPage() {
        const url = this.nextPageUrl;
        if (!url) return null;
        return await this.load_image(url);
    }
    get nextPageUrl() {
        if (this.currentIndex == this.pageCount) return null;
        const a = this.doc.getElementById("next");
        if (a === null) return null;
        return a.getAttribute("href");
    }
    get original_url() {
        const a = this.doc.querySelector("#i7 a");
        if (a == null) return null;
        return a.getAttribute("href");
    }
    get pageCount() {
        const e = this.doc.querySelector("#i2>div span:last-child");
        if (!e) throw Error("Failed to find page count element.");
        return parseInt(e.innerHTML);
    }
    async prevPage() {
        const url = this.prevPageUrl;
        if (!url) return null;
        return await this.load_image(url);
    }
    get prevPageUrl() {
        if (this.currentIndex == this.pageCount) return null;
        const a = this.doc.getElementById("prev");
        if (a === null) return null;
        return a.getAttribute("href");
    }
}

export async function load_single_page(html: string, client: Client) {
    await initDOMParser();
    return new SinglePage(html, client);
}
