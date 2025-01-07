import { FreshContext } from "$fresh/server.ts";
import { basename, join, normalize } from "@std/path";
import {
    get_file_response,
    GetFileResponseOptions,
} from "../server/get_file_response.ts";
import { exists } from "@std/fs/exists";
import { get_task_manager } from "../server.ts";
import { build_sw } from "../server/build_sw.ts";
import { i18n_get_lang } from "../server/i18ns.ts";
import { SharedTokenType } from "../db.ts";
import { initDOMParser } from "../utils.ts";
import { DOMParser } from "deno_dom/wasm-noinit";
import { get_host, return_error } from "../server/utils.ts";
import { base_logger } from "../utils/logger.ts";
import { parse as parseYaml } from "@std/yaml/parse";

const STATIC_FILES = ["/common.css", "/scrollBar.css", "/sw.js", "/sw.js.map"];

const logger = base_logger.get_logger("middleware");

async function default_handler(req: Request, ctx: FreshContext) {
    const url = new URL(req.url);
    const m = get_task_manager();
    const enable_server_timing = m.cfg.enable_server_timing;
    const start = enable_server_timing ? Date.now() : 0;
    if (url.pathname == "/sw.js") {
        build_sw();
    }
    if (STATIC_FILES.includes(url.pathname)) {
        let base = import.meta.resolve("../static").slice(7);
        if (Deno.build.os === "windows") {
            base = base.slice(1);
        }
        const file = join(base, url.pathname.slice(1));
        const opts: GetFileResponseOptions = {};
        opts.range = req.headers.get("Range");
        opts.if_modified_since = req.headers.get("If-Modified-Since");
        if (file.endsWith(".js.map")) {
            opts.mimetype = "application/json";
        }
        return get_file_response(file, opts);
    }
    if (url.pathname == "/flutter" || url.pathname.startsWith("/flutter/")) {
        let flutter_base = import.meta.resolve("../static/flutter").slice(7);
        if (Deno.build.os === "windows") {
            flutter_base = flutter_base.slice(1);
        }
        if (!m.cfg.flutter_frontend) {
            if (!await exists(flutter_base)) {
                return new Response("Flutter frontend is not enabled", {
                    status: 404,
                });
            }
        } else {
            flutter_base = m.cfg.flutter_frontend;
        }
        let p = join(flutter_base, url.pathname.slice(8));
        if (!(await exists(p)) || normalize(p) === normalize(flutter_base)) {
            p = join(flutter_base, "/index.html");
        }
        if (url.pathname == "/flutter/manifest.json") {
            const lang = i18n_get_lang(req, ["zh-cn"]);
            if (lang !== "en") {
                const tp = join(flutter_base, `/manifest.${lang}.json`);
                if (await exists(tp)) {
                    p = tp;
                }
            }
        }
        if (
            url.pathname.startsWith("/flutter/gallery/") &&
            url.searchParams.has("share")
        ) {
            const token = url.searchParams.get("share")!;
            const st = m.db.get_shared_token(token);
            const now = Date.now();
            if (
                st && st.type == SharedTokenType.Gallery &&
                (st.expired === null || st.expired.getTime() >= now)
            ) {
                const b = `/flutter/gallery/${st.info.gid}`;
                const g = m.db.get_gmeta_by_gid(st.info.gid);
                if (
                    (url.pathname == b || url.pathname.startsWith(b + "/")) && g
                ) {
                    const html = await Deno.readTextFile(p);
                    await initDOMParser();
                    try {
                        const dom = (new DOMParser()).parseFromString(
                            html,
                            "text/html",
                        );
                        const doc = dom.documentElement!;
                        const title = g.title;
                        const desc = g.title_jpn;
                        doc.querySelector("head title")!.innerText = title;
                        doc.querySelector(
                            'meta[name="apple-mobile-web-app-title"]',
                        )?.setAttribute("content", title);
                        doc.querySelector('meta[name="description"]')
                            ?.setAttribute("content", desc);
                        const head = doc.querySelector("head");
                        const ogt = dom.createElement("meta");
                        ogt.setAttribute("name", "og:title");
                        ogt.setAttribute("content", title);
                        const ogd = dom.createElement("meta");
                        ogd.setAttribute("name", "og:description");
                        ogd.setAttribute("content", desc);
                        head?.append(ogt);
                        head?.append(ogd);
                        if (doc) {
                            const p = m.db.get_pmeta_by_index(st.info.gid, 1);
                            if (p) {
                                const t = m.db.get_files(p.token);
                                if (t.length) {
                                    const url = `${
                                        get_host(req)
                                    }/api/thumbnail/${t[0].id}?max=1920&share=${
                                        encodeURIComponent(st.token)
                                    }`;
                                    const me = dom.createElement("meta");
                                    me.setAttribute("name", "og:image");
                                    me.setAttribute("content", url);
                                    const ogty = dom.createElement("meta");
                                    ogty.setAttribute("name", "twitter:card");
                                    ogty.setAttribute(
                                        "content",
                                        "summary_large_image",
                                    );
                                    head?.append(me);
                                    head?.append(ogty);
                                }
                            }
                        }
                        return new Response(
                            "<!DOCTYPE html>\n" + doc.outerHTML,
                            {
                                headers: {
                                    "Content-Type": "text/html; charset=UTF-8",
                                },
                            },
                        );
                    } catch (_) {
                        null;
                    }
                }
            }
        }
        const opts: GetFileResponseOptions = {};
        opts.range = req.headers.get("range");
        opts.if_modified_since = req.headers.get("If-Modified-Since");
        opts.if_unmodified_since = req.headers.get("If-Unmodified-Since");
        return await get_file_response(p, opts);
    }
    if (url.pathname.startsWith("/canvaskit/")) {
        let flutter_base = import.meta.resolve("../static/flutter").slice(7);
        if (Deno.build.os === "windows") {
            flutter_base = flutter_base.slice(1);
        }
        if (!m.cfg.flutter_frontend) {
            if (!await exists(flutter_base)) {
                return new Response("Flutter frontend is not enabled", {
                    status: 404,
                });
            }
        } else {
            flutter_base = m.cfg.flutter_frontend;
        }
        const p = join(flutter_base, "canvaskit", url.pathname.slice(11));
        const opts: GetFileResponseOptions = {};
        opts.range = req.headers.get("range");
        opts.if_modified_since = req.headers.get("If-Modified-Since");
        opts.if_unmodified_since = req.headers.get("If-Unmodified-Since");
        return await get_file_response(p, opts);
    }
    if (url.pathname == "/swagger" || url.pathname.startsWith("/swagger/")) {
        let swagger_base = import.meta.resolve("../static/swagger").slice(7);
        if (Deno.build.os === "windows") {
            swagger_base = swagger_base.slice(1);
        }
        let p = join(swagger_base, url.pathname.slice(9));
        if (basename(p) == "swagger-initializer.js") {
            p = join(swagger_base, "../swagger-initializer.js");
        }
        if (!(await exists(p)) || normalize(p) === normalize(swagger_base)) {
            p = join(swagger_base, "/index.html");
        }
        if (basename(p) == "index.html") {
            const html = await Deno.readTextFile(p);
            await initDOMParser();
            try {
                const dom = (new DOMParser()).parseFromString(
                    html,
                    "text/html",
                );
                const doc = dom.documentElement!;
                const head = doc.querySelector("head");
                if (!head) {
                    throw new Error("head not found");
                }
                const base = dom.createElement("base");
                base.setAttribute("href", "/swagger/");
                head?.append(base);
                const css_links = doc.querySelectorAll("link[rel=stylesheet]");
                for (const link of css_links) {
                    const href = link.getAttribute("href");
                    if (href) {
                        if (href.startsWith("/")) continue;
                        link.setAttribute("href", `/swagger/${href}`);
                    }
                }
                return new Response(
                    "<!DOCTYPE html>\n" + doc.outerHTML,
                    {
                        headers: {
                            "Content-Type": "text/html; charset=UTF-8",
                        },
                    },
                );
            } catch (e) {
                logger.warn("Failed to handle swagger index.html:", e);
                if (url.pathname == "/swagger") {
                    return Response.redirect(
                        `${get_host(req)}/swagger/index.html`,
                        302,
                    );
                }
            }
        }
        const opts: GetFileResponseOptions = {};
        opts.range = req.headers.get("range");
        opts.if_modified_since = req.headers.get("If-Modified-Since");
        opts.if_unmodified_since = req.headers.get("If-Unmodified-Since");
        return await get_file_response(p, opts);
    }
    if (url.pathname == "/api.json") {
        let filepath = import.meta.resolve("../api.yml").slice(7);
        if (Deno.build.os === "windows") {
            filepath = filepath.slice(1);
        }
        const data = <Record<string, unknown>> parseYaml(
            await Deno.readTextFile(filepath),
        );
        data["servers"] = [{ url: "/api", description: "API Server" }];
        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" },
        });
    }
    const res = await ctx.next();
    if (enable_server_timing) {
        if (res.status === 101) return res;
        const headers = new Headers(res.headers);
        const now = Date.now();
        headers.append("Server-Timing", `total;dur=${now - start}`);
        return new Response(res.body, {
            status: res.status,
            headers: headers,
            statusText: res.statusText,
        });
    }
    return res;
}

// Disable error stack
const unhandle_error_logger = base_logger.get_logger("unhandle_error", {
    stack: false,
});

async function handleError(req: Request, ctx: FreshContext) {
    try {
        return await ctx.next();
    } catch (e) {
        unhandle_error_logger.error(e);
        try {
            const u = new URL(req.url);
            const is_api = u.pathname.startsWith("/api");
            return is_api
                ? return_error(500, "Internal Server Error")
                : new Response("Internal Server Error", { status: 500 });
        } catch (_) {
            return new Response("Internal Server Error", { status: 500 });
        }
    }
}

export const handler = [
    handleError,
    default_handler,
];
