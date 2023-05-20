import { DOMParser } from "deno_dom/deno-dom-wasm-noinit.ts";
import { Client } from "../client.ts";
import { initDOMParser } from "../utils.ts";

export type MPVRawImage = {
    /**Image name*/
    n: string;
    /**Page token*/
    k: string;
    /**Thumbnail*/
    t: string;
};

export type MPVDispatchData = {
    /**width x height :: file size*/
    d: string;
    /**Image*/
    i: string;
    /**URL to load full image. full url is `${base_url}${lf}` */
    lf: string;
    /**Forum token url. full url is `${base_url}r/${ll}`*/
    ll: string;
    /**File search url. full url is `${base_url}${lo}` */
    lo: string;
    /**`ori` or `Download original ${width} x ${height} ${file_size} source`*/
    o: string;
    /**Reload token*/
    s: string;
    /**Width*/
    xres: string;
    /**Height*/
    yres: string;
};

class MPVImage {
    base;
    /**Page number*/
    index;
    #mpv;
    data: MPVDispatchData | undefined;
    constructor(base: MPVRawImage, index: number, mpv: MPVPage) {
        this.base = base;
        this.index = index;
        this.#mpv = mpv;
    }
    get name() {
        return this.base.n;
    }
    get page_number() {
        return this.index;
    }
    get page_token() {
        return this.base.k;
    }
    get thumbnail() {
        return this.base.t;
    }
    get xres() {
        const xres = this.data?.xres;
        if (!xres) return undefined;
        return parseInt(xres);
    }
    get yres() {
        const yres = this.data?.yres;
        if (!yres) return undefined;
        return parseInt(yres);
    }
    async load() {
        if (this.data === undefined) {
            this.data = await this.#mpv.image_dispatch(
                this.index,
                this.page_token,
            );
        }
    }
}

class MPVPage {
    dom;
    doc;
    client;
    #meta_script: string | undefined;
    #api_url: string | undefined;
    #gid: number | undefined;
    #mpvkey: string | undefined;
    #pagecount: number | undefined;
    #imagelist: MPVImage[] | undefined;
    #base_url: string | undefined;
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
    get api_url() {
        if (this.#api_url === undefined) {
            const api_url: string = eval(`${this.meta_script};api_url`);
            this.#api_url = api_url;
            return api_url;
        } else return this.#api_url;
    }
    get base_url() {
        if (this.#base_url === undefined) {
            const base_url: string = eval(`${this.meta_script};base_url`);
            this.#base_url = base_url;
            return base_url;
        } else return this.#base_url;
    }
    async image_dispatch(
        page: number,
        imgkey: string,
        nl: string | undefined = undefined,
    ): Promise<MPVDispatchData> {
        const param: Record<string, unknown> = {
            method: "imagedispatch",
            gid: this.gid,
            page,
            imgkey,
            mpvkey: this.mpvkey,
        };
        if (nl) param.nl = nl;
        const re = await this.client.post(this.api_url, {
            body: JSON.stringify(param),
            headers: { "content-type": "application/json" },
        });
        if (re.status != 200) {
            throw new Error(
                `Fetch ${this.api_url} failed, status ${re.status} ${re.statusText}`,
            );
        }
        return re.json();
    }
    get gid() {
        if (this.#gid === undefined) {
            const gid: number = eval(`${this.meta_script};gid`);
            this.#gid = gid;
            return gid;
        } else return this.#gid;
    }
    get imagelist() {
        if (this.#imagelist === undefined) {
            const t: MPVRawImage[] = eval(`${this.meta_script};imagelist`);
            const imagelist = t.map((v, i) => new MPVImage(v, i + 1, this));
            return imagelist;
        } else return this.#imagelist;
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
    get mpvkey() {
        if (this.#mpvkey === undefined) {
            const mpvkey: string = eval(`${this.meta_script};mpvkey`);
            this.#mpvkey = mpvkey;
            return mpvkey;
        } else return this.#mpvkey;
    }
    get pagecount() {
        if (this.#pagecount === undefined) {
            const pagecount: number = eval(`${this.meta_script};pagecount`);
            this.#pagecount = pagecount;
            return pagecount;
        } else return this.#pagecount;
    }
}

export async function load_mpv_page(html: string, client: Client) {
    await initDOMParser();
    return new MPVPage(html, client);
}
