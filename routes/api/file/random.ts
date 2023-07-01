import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import { parse_bool } from "../../../server/parse_form.ts";
import { get_host } from "../../../server/utils.ts";

export const handler: Handlers = {
    async GET(req, _ctx) {
        const m = get_task_manager();
        const u = new URL(req.url);
        const is_nsfw = await parse_bool(u.searchParams.get("is_nsfw"), null);
        const is_ad = await parse_bool(u.searchParams.get("is_ad"), null);
        const thumb = await parse_bool(u.searchParams.get("thumb"), false);
        const f = m.db.get_random_file(is_nsfw, is_ad);
        if (!f) return new Response("File not found.", { status: 404 });
        const t = thumb ? "thumbnail" : "file";
        return Response.redirect(`${get_host(req)}/api/${t}/${f.id}`);
    },
};
