import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import {
    get_file_response,
    GetFileResponseOptions,
} from "../../../server/get_file_response.ts";

export const handler: Handlers = {
    async GET(req, ctx) {
        const id = parseInt(ctx.params.id);
        if (isNaN(id)) {
            return new Response("Bad Request", { status: 400 });
        }
        const m = get_task_manager();
        const f = m.db.get_file(id);
        if (!f) {
            return new Response("File not found.", { status: 404 });
        }
        const opts: GetFileResponseOptions = {};
        const range = req.headers.get("range");
        if (range) opts.range = range;
        return await get_file_response(f.path, opts);
    },
};
