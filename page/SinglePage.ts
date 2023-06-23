import { DOMParser } from "deno_dom/deno-dom-wasm-noinit.ts";
import { Client } from "../client.ts";
import { initDOMParser } from "../utils.ts";

export class SinglePage {
    dom;
    doc;
    client;
    _meta: string | undefined;
    _gid: number | undefined;
    #i2_data: string | undefined;
    #i7_data: string | undefined;
    #oxres: number | undefined;
    #oyres: number | undefined;
    #xres: number | undefined;
    #yres: number | undefined;
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
    get i2_data() {
        if (this.#i2_data === undefined) {
            const ele = this.doc.querySelector("#i2 > div:not([class=sn])");
            if (!ele) throw Error("Element not found.");
            /**@ts-ignore */
            const e = ele as HTMLElement;
            const i2_data = e.innerText;
            this.#i2_data = i2_data;
            return i2_data;
        } else return this.#i2_data;
    }
    get i7_data() {
        if (this.#i7_data === undefined) {
            const ele = this.doc.querySelector("#i7 a");
            if (!ele) throw Error("Element not found.");
            /**@ts-ignore */
            const e = ele as HTMLElement;
            const i7_data = e.innerText;
            this.#i7_data = i7_data;
            return i7_data;
        } else return this.#i7_data;
    }
    get img_url() {
        const img = this.doc.querySelector("#img");
        if (!img) throw Error("Unknown image url.");
        const url = img.getAttribute("src");
        if (!url) throw Error("Unknown image url.");
        return url;
    }
    get is_original() {
        return this.original_url === null;
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
    get name() {
        return this.i2_data.match(/(.*?) ::/)?.at(1);
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
    get origin_xres() {
        if (this.is_original) return this.xres;
        if (this.#oxres === undefined) {
            const ox = this.i7_data.match(/(\d+) x \d+/)?.at(1);
            if (!ox) throw Error("Failed to parse width.");
            const oxres = parseInt(ox);
            this.#oxres = oxres;
            return oxres;
        } else return this.#oxres;
    }
    get origin_yres() {
        if (this.is_original) return this.yres;
        if (this.#oyres === undefined) {
            const oy = this.i7_data.match(/\d+ x (\d+)/)?.at(1);
            if (!oy) throw Error("Failed to parse height.");
            const oyres = parseInt(oy);
            this.#oyres = oyres;
            return oyres;
        } else return this.#oyres;
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
    get xres() {
        if (this.#xres === undefined) {
            const xr = this.i2_data.match(/.*? :: (\d+)/)?.at(1);
            if (!xr) throw Error("Failed to parse width.");
            const xres = parseInt(xr);
            this.#xres = xres;
            return xres;
        } else return this.#xres;
    }
    get yres() {
        if (this.#yres === undefined) {
            const yr = this.i2_data.match(/.*? :: \d+ x (\d+)/)?.at(1);
            if (!yr) throw Error("Failed to parse height.");
            const yres = parseInt(yr);
            this.#yres = yres;
            return yres;
        } else return this.#yres;
    }
}

export async function load_single_page(html: string, client: Client) {
    await initDOMParser();
    return new SinglePage(html, client);
}
