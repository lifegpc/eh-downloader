import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";

export const handler: Handlers = {
    GET(req, _ctx) {
        const m = get_task_manager();
        const f = m.db.get_random_file();
        if (!f) return new Response("File not found.", { status: 404 });
        const u = new URL(req.url);
        return Response.redirect(`${u.origin}/api/file/${f.id}`);
    },
};
