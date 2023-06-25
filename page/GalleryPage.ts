import { DOMParser, Element } from "deno_dom/deno-dom-wasm-noinit.ts";
import { extname } from "std/path/mod.ts";
import { Client } from "../client.ts";
import { EhFile, PMeta } from "../db.ts";
import { initDOMParser, map, parse_bool } from "../utils.ts";
import { parseUrl, UrlType } from "../url.ts";
import { SinglePage } from "./SinglePage.ts";

type Page = {
    token: string;
    thumbnail: string;
    name: string;
    index: number;
};

class Image {
    base;
    #gp;
    data: SinglePage | undefined;
    redirected_url: string | undefined;
    constructor(base: Page, gp: GalleryPage) {
        this.base = base;
        this.#gp = gp;
    }
    get_file(path: string): EhFile | undefined {
        const width = this.xres;
        if (width === undefined) return undefined;
        const height = this.yres;
        if (height === undefined) return undefined;
        const is_original = this.is_original;
        if (is_original === undefined) return undefined;
        return {
            id: 0,
            token: this.page_token,
            path,
            width,
            height,
            is_original,
        };
    }
    get_original_file(path: string): EhFile | undefined {
        const width = this.origin_xres;
        if (width === undefined) return undefined;
        const height = this.origin_yres;
        if (height === undefined) return undefined;
        return {
            id: 0,
            token: this.page_token,
            path,
            width,
            height,
            is_original: true,
        };
    }
    get index() {
        return this.base.index;
    }
    get is_original() {
        return this.data?.is_original;
    }
    get name() {
        return this.base.name;
    }
    get original_imgurl() {
        return this.data?.original_url;
    }
    get origin_xres() {
        return this.data?.origin_xres;
    }
    get origin_yres() {
        return this.data?.origin_yres;
    }
    get page_number() {
        return this.base.index;
    }
    get page_token() {
        return this.base.token;
    }
    get sampled_name() {
        const name = this.data?.name;
        if (name) return name;
        const n = this.base.name;
        const e = extname(n);
        const b = n.slice(0, n.length - e.length);
        if (n === ".gif") return `${b}.gif`;
        return `${b}.jpg`;
    }
    get src() {
        return this.data?.img_url;
    }
    get xres() {
        return this.data?.xres;
    }
    get yres() {
        return this.data?.yres;
    }
    async load() {
        if (this.data === undefined) {
            this.data = await this.#gp.client.fetchSignlePage(
                this.#gp.gid,
                this.page_token,
                this.base.index,
            );
        } else {
            this.data = await this.#gp.client.fetchSignlePage(
                this.#gp.gid,
                this.page_token,
                this.base.index,
                this.data.nl,
            );
        }
    }
    async #load_image(u: string) {
        const re = await this.#gp.client.get(u);
        if (re.status !== 200) {
            re.body?.cancel();
            return undefined;
        }
        return re;
    }
    async load_image(reload = true) {
        const src = this.src;
        if (src) {
            const re = await this.#load_image(src);
            if (re) return re;
        }
        if (!reload) return;
        await this.load();
        const src2 = this.src;
        if (src2) return await this.#load_image(src2);
    }
    async load_original_image() {
        if (this.redirected_url) {
            const re = await this.#load_image(this.redirected_url);
            if (re) return re;
        }
        const url = this.original_imgurl;
        if (!url) return undefined;
        this.redirected_url = await this.#gp.client.redirect(url);
        return await this.#load_image(this.redirected_url || url);
    }
    to_pmeta(): PMeta | undefined {
        if (!this.data) return undefined;
        const gid = this.#gp.gid;
        const index = this.base.index;
        const token = this.page_token;
        const name = this.name;
        const width = this.origin_xres;
        if (width === undefined) return undefined;
        const height = this.origin_yres;
        if (height === undefined) return undefined;
        return { gid, index, token, name, width, height };
    }
}

class GalleryPage {
    dom;
    doc;
    client;
    #tags: Set<string> | undefined = undefined;
    #gdd_data: Map<string, Element> | undefined = undefined;
    #meta_script: string | undefined = undefined;
    #gid: number | undefined = undefined;
    #token: string | undefined = undefined;
    #mpv_enabled: boolean | undefined = undefined;
    #new_version: Array<{ gid: number; token: string }> | undefined = undefined;
    #imagelist: Image[] | undefined = undefined;
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
    }
    async #get_imagelist() {
        function load_image(doc: Element): Page[] {
            const eles = doc.querySelectorAll("#gdt > div[class^=gdt]");
            return map(eles, (e) => {
                const b = e as Element;
                const a = b.querySelector("a");
                if (!a) throw Error("Link not found.");
                const href = a.getAttribute("href");
                if (!href) throw Error("Link not found.");
                const u = parseUrl(href);
                if (!u || u.type !== UrlType.Single || u.index === undefined) {
                    throw Error("Failed to parse url.");
                }
                const token = u.token;
                const index = u.index;
                const img = b.querySelector("img");
                if (!img) throw Error("Image not found.");
                const thumbnail = img.getAttribute("src");
                if (!thumbnail) throw Error("Image source not found");
                const name = img.getAttribute("title")?.match(/page \d+: (.*)/i)
                    ?.at(1);
                if (!name) throw Error("name not found");
                return { name, token, thumbnail, index };
            });
        }
        let b = load_image(this.doc);
        // deno-lint-ignore no-this-alias
        let now: GalleryPage = this;
        while (now.has_next_page) {
            now = await now.next_page();
            b = b.concat(load_image(now.doc));
        }
        return b.map((v) => new Image(v, this));
    }
    get favorited() {
        const o = this.gdd_data.get("Favorited")?.innerText;
        if (!o) return undefined;
        const p = o.slice(0, o.length - 6);
        return parseInt(p);
    }
    get file_size() {
        return this.gdd_data.get("File Size")?.innerText;
    }
    get gdd_data() {
        if (this.#gdd_data === undefined) {
            const g = new Map<string, Element>();
            const t = <Element[]> Array.from(
                this.doc.querySelectorAll("#gdd > table tr"),
            );
            for (const e of t) {
                const k = e.children[0].innerText;
                g.set(k.slice(0, k.length - 1), e.children[1]);
            }
            this.#gdd_data = g;
            return g;
        } else return this.#gdd_data;
    }
    get gid() {
        if (this.#gid === undefined) {
            const gid: number = eval(`${this.meta_script};gid`);
            this.#gid = gid;
            return gid;
        }
        return this.#gid;
    }
    get has_next_page() {
        return this.doc.querySelector(".ptt td:last-child a") !== null;
    }
    get imagelist(): Promise<Image[]> {
        return new Promise((resolve, reject) => {
            if (this.#imagelist === undefined) {
                this.#get_imagelist().then((imagelist) => {
                    this.#imagelist = imagelist;
                    resolve(imagelist);
                }).catch(reject);
            } else resolve(this.#imagelist);
        });
    }
    get language() {
        const o = this.gdd_data.get("Language")?.innerText;
        if (!o) return undefined;
        if (o.endsWith("TR")) {
            return o.slice(0, o.length - 2).trim();
        } else return o.trim();
    }
    get length() {
        const o = this.gdd_data.get("Length")?.innerText;
        if (!o) throw Error("Unknown length.");
        const p = o.slice(0, o.length - 6);
        return parseInt(p);
    }
    get meta_script() {
        if (this.#meta_script === undefined) {
            const c = this.doc.getElementsByTagName("script");
            for (const e of c) {
                const t = e.innerHTML.trim();
                if (t.startsWith("var ")) {
                    this.#meta_script = t;
                    return t;
                }
            }
            throw Error("Failed to locate meta script.");
        } else return this.#meta_script;
    }
    get mpv_enabled() {
        if (this.#mpv_enabled === undefined) {
            const e = this.doc.querySelector("#gdt a");
            if (!e) throw Error("Page not found.");
            const u = e.getAttribute("href");
            if (!u) throw Error("Url not found.");
            const p = parseUrl(u);
            if (!p) throw Error("Failed to parse url.");
            const mpv_enabled = p.type === UrlType.MPV;
            this.#mpv_enabled = mpv_enabled;
            return mpv_enabled;
        } else return this.#mpv_enabled;
    }
    get name() {
        const ele = this.doc.getElementById("gn");
        if (!ele) throw Error("Failed to find gallery's name.");
        return ele.innerText;
    }
    get new_version() {
        if (this.#new_version === undefined) {
            const eles = this.doc.querySelectorAll("#gnd > a");
            const d = <{ gid: number; token: string }[]> map(eles, (e) => {
                const b = e as Element;
                const u = b.getAttribute("href");
                if (!u) return null;
                const d = parseUrl(u);
                if (d?.type === UrlType.Gallery) {
                    return { gid: d.gid, token: d.token };
                } else {
                    return null;
                }
            }).filter((d) => d !== null);
            this.#new_version = d;
            return d;
        } else return this.#new_version;
    }
    async next_page() {
        const url = this.doc.querySelector(".ptt td:last-child a")
            ?.getAttribute("href");
        if (!url) throw Error("Url not found.");
        const re = await this.client.get(url);
        if (re.status != 200) {
            throw new Error(
                `Fetch ${url} failed, status ${re.status} ${re.statusText}`,
            );
        }
        return load_gallery_page(await re.text(), this.client);
    }
    get japanese_name() {
        return this.doc.getElementById("gj")?.innerText;
    }
    get tags() {
        if (this.#tags === undefined) {
            const eles = <Element[]> Array.from(
                this.doc.querySelectorAll("[id^=td_]"),
            );
            const tags = new Set(eles.map((e) => e.id.slice(3)));
            this.#tags = tags;
            return tags;
        } else return this.#tags;
    }
    get token() {
        if (this.#token === undefined) {
            const token: string = eval(`${this.meta_script};token`);
            this.#token = token;
            return token;
        }
        return this.#token;
    }
    get visible() {
        const s = this.gdd_data.get("Visible")?.innerText;
        if (s === undefined) return undefined;
        return parse_bool(s);
    }
}

export async function load_gallery_page(html: string, client: Client) {
    await initDOMParser();
    return new GalleryPage(html, client);
}
