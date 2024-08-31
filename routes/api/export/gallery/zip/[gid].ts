import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../../../server.ts";
import { get_export_zip_response } from "../../../../../server/export_zip.ts";
import { parse_bool, parse_int } from "../../../../../server/parse_form.ts";
import type { ExportZipConfig } from "../../../../../tasks/export_zip.ts";
import { User, UserPermission } from "../../../../../db.ts";
import { isNumNaN, parseBigInt } from "../../../../../utils.ts";

export const handler: Handlers = {
    async GET(req, ctx) {
        const u = <User | undefined> ctx.state.user;
        if (
            u && !u.is_admin &&
            !(Number(u.permissions) & UserPermission.ReadGallery)
        ) {
            return new Response("Permission denied", { status: 403 });
        }
        const gid = parseBigInt(ctx.params.gid);
        if (isNumNaN(gid)) {
            return new Response("Bad Request", { status: 400 });
        }
        const params = new URL(req.url).searchParams;
        const cfg: ExportZipConfig = {};
        cfg.jpn_title = await parse_bool(params.get("jpn_title"), false);
        cfg.max_length = await parse_int(params.get("max_length"), 0);
        cfg.export_ad = await parse_bool(params.get("export_ad"), false);
        const m = get_task_manager();
        return get_export_zip_response(gid, m.db, cfg);
    },
};
