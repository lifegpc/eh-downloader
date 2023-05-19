import {
    DOMParser,
    Element,
} from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm-noinit.ts";
import { Client } from "../client.ts";
import { initDOMParser, parse_bool } from "../utils.ts";

class GalleryPage {
    dom;
    doc;
    client;
    #tags: Set<string> | undefined = undefined;
    #gdd_data: Map<string, Element> | undefined = undefined;
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
    get name() {
        const ele = this.doc.getElementById("gn");
        if (!ele) throw Error("Failed to find gallery's name.");
        return ele.innerText;
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
