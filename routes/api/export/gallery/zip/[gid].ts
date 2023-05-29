import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../../../server.ts";
import { get_export_zip_response } from "../../../../../server/export_zip.ts";

export const handler: Handlers = {
    GET(_req, ctx) {
        const gid = parseInt(ctx.params.gid);
        if (isNaN(gid)) {
            return new Response("Bad Request", { status: 400 });
        }
        const m = get_task_manager();
        try {
            return get_export_zip_response(gid, m.db);
        } catch (e) {
            console.error(e);
            return new Response("Gallery not found.", { status: 404 });
        }
    },
};
