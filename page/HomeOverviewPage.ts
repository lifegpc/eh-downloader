import { DOMParser, Element } from "deno_dom/deno-dom-wasm-noinit.ts";
import { initDOMParser } from "../utils.ts";

export class HomeOverviewPage {
    dom;
    doc;
    #panel: Map<string, Element> | undefined;
    #current_image_limit: number | undefined;
    #max_image_limit: number | undefined;
    constructor(html: string) {
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
    }
    get panel() {
        if (this.#panel === undefined) {
            const panel = new Map<string, Element>();
            const keys = this.doc.querySelectorAll(".stuffbox > h2");
            for (const key of keys) {
                const k = key as Element;
                const v = k.nextElementSibling;
                if (v) {
                    panel.set(k.innerText, v as Element);
                }
            }
            this.#panel = panel;
            return panel;
        } else return this.#panel;
    }
    get current_image_limit() {
        if (this.#current_image_limit === undefined) {
            const panel = this.panel.get("Image Limits");
            if (!panel) {
                throw Error('Failed to find panel "Image Limits".');
            }
            const limits = panel.querySelectorAll("p:nth-child(1) > strong");
            if (!limits.length) {
                throw Error("Failed to find limits.");
            }
            const current = limits[0] as Element;
            const max = limits[1] as Element;
            const current_image_limit = parseInt(current.innerText);
            const max_image_limit = parseInt(max.innerText);
            if (isNaN(current_image_limit) || isNaN(max_image_limit)) {
                throw Error("Failed to parse limits.");
            }
            this.#current_image_limit = current_image_limit;
            this.#max_image_limit = max_image_limit;
            return current_image_limit;
        } else return this.#current_image_limit;
    }
    get max_image_limit(): number {
        if (this.#max_image_limit === undefined) {
            this.current_image_limit;
            // @ts-ignore Already assigned in current_image_limit.
            return this.#max_image_limit;
        } else return this.#max_image_limit;
    }
}

export async function load_home_overview_page(html: string) {
    await initDOMParser();
    return new HomeOverviewPage(html);
}
