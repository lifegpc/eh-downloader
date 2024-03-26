import { FreshContext } from "$fresh/server.ts";
import { join } from "std/path/mod.ts";
import {
    get_file_response,
    GetFileResponseOptions,
} from "../server/get_file_response.ts";
import { exists } from "std/fs/exists.ts";
import { get_task_manager } from "../server.ts";
import { build_sw } from "../server/build_sw.ts";

const STATIC_FILES = ["/common.css", "/scrollBar.css", "/sw.js", "/sw.js.map"];

export async function handler(req: Request, ctx: FreshContext) {
    const url = new URL(req.url);
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
        const m = get_task_manager();
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
        const u = new URL(req.url);
        let p = join(flutter_base, u.pathname.slice(8));
        if (!(await exists(p)) || p === flutter_base) {
            p = join(flutter_base, "/index.html");
        }
        const opts: GetFileResponseOptions = {};
        opts.range = req.headers.get("range");
        opts.if_modified_since = req.headers.get("If-Modified-Since");
        opts.if_unmodified_since = req.headers.get("If-Unmodified-Since");
        return await get_file_response(p, opts);
    }
    const res = await ctx.next();
    return res;
}
