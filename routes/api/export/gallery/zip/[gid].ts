import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../../../server.ts";
import { get_export_zip_response } from "../../../../../server/export_zip.ts";
import { parse_bool } from "../../../../../server/parse_form.ts";
import { ExportZipConfig } from "../../../../../tasks/export_zip.ts";

export const handler: Handlers = {
    async GET(req, ctx) {
        const gid = parseInt(ctx.params.gid);
        if (isNaN(gid)) {
            return new Response("Bad Request", { status: 400 });
        }
        const params = new URL(req.url).searchParams;
        const cfg: ExportZipConfig = {};
        cfg.jpn_title = await parse_bool(params.get("jpn_title"), false);
        const m = get_task_manager();
        return get_export_zip_response(gid, m.db, cfg);
    },
};