import { DOMParser, Element } from "deno_dom/deno-dom-wasm-noinit.ts";
import { Client } from "../client.ts";
import { initDOMParser, map, parse_bool } from "../utils.ts";
import { parseUrl, UrlType } from "../url.ts";

type Page = {
    token: string;
    thumbnail: string;
    name: string;
};

class Image {
    base;
    /**Page number*/
    index;
    #gp;
    constructor(base: Page, index: number, gp: GalleryPage) {
        this.base = base;
        this.index = index;
        this.#gp = gp;
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
                if (!u || u.type !== UrlType.Single) {
                    throw Error("Failed to parse url.");
                }
                const token = u.token;
                const img = b.querySelector("img");
                if (!img) throw Error("Image not found.");
                const thumbnail = img.getAttribute("src");
                if (!thumbnail) throw Error("Image source not found");
                const name = img.getAttribute("title")?.match(/page \d+: (.*)/i)
                    ?.at(1);
                if (!name) throw Error("name not found");
                return { name, token, thumbnail };
            });
        }
        let b = load_image(this.doc);
        // deno-lint-ignore no-this-alias
        let now: GalleryPage = this;
        while (now.has_next_page) {
            now = await now.next_page();
            b = b.concat(load_image(now.doc));
        }
        return b.map((v, i) => new Image(v, i + 1, this));
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
