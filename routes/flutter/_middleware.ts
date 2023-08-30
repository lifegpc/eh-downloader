import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { get_task_manager } from "../../server.ts";
import { join } from "std/path/mod.ts";
import { exists } from "std/fs/exists.ts";
import {
    get_file_response,
    GetFileResponseOptions,
} from "../../server/get_file_response.ts";

export async function handler(req: Request, _ctx: MiddlewareHandlerContext) {
    const m = get_task_manager();
    if (!m.cfg.flutter_frontend) {
        return new Response("Flutter frontend is not enabled", { status: 404 });
    }
    const u = new URL(req.url);
    let p = join(m.cfg.flutter_frontend, u.pathname);
    if (!(await exists(p))) {
        p = join(m.cfg.flutter_frontend, "/index.html");
    }
    const opts: GetFileResponseOptions = {};
    opts.range = req.headers.get("range");
    opts.if_modified_since = req.headers.get("If-Modified-Since");
    opts.if_unmodified_since = req.headers.get("If-Unmodified-Since");
    return await get_file_response(p, opts);
}
