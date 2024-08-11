import { Handlers } from "$fresh/server.ts";
import { exists } from "@std/fs/exists";
import {
    SharedToken,
    SharedTokenType,
    User,
    UserPermission,
} from "../../db.ts";
import { get_task_manager } from "../../server.ts";
import {
    get_string,
    parse_big_int,
    parse_int,
} from "../../server/parse_form.ts";
import { get_host, return_data, return_error } from "../../server/utils.ts";

export const handler: Handlers = {
    GET(_req, ctx) {
        const st = <SharedToken | undefined> ctx.state.shared_token;
        if (!st) return return_error(1, "No token.");
        return return_data(st);
    },
    async PUT(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        let form: FormData | undefined;
        try {
            form = await req.formData();
        } catch (_) {
            return return_error(400, "Bad Request");
        }
        const typ = await get_string(form.get("type"));
        const expired = await parse_int(form.get("expired"), null);
        if (typ == "gallery") {
            if (
                user && !user.is_admin &&
                !(user.permissions & UserPermission.ShareGallery)
            ) {
                return return_error(403, "Permission denied.");
            }
            const gid = await parse_big_int(form.get("gid"), null);
            if (!gid) return return_error(2, "gid not specified.");
            const m = get_task_manager();
            const st = m.db.add_shared_token(SharedTokenType.Gallery, {
                gid: gid,
            }, expired ? new Date(expired) : null);
            let flutter_base = import.meta.resolve("../../static/flutter")
                .slice(7);
            if (Deno.build.os === "windows") {
                flutter_base = flutter_base.slice(1);
            }
            if (m.cfg.flutter_frontend) {
                flutter_base = m.cfg.flutter_frontend;
            }
            const existed = await exists(flutter_base);
            const base = existed
                ? `${get_host(req)}/flutter`
                : "https://dev.ehf.lifegpc.com/#";
            const url = `${base}/gallery/${gid}?share=${st.token}`;
            return return_data({ url, token: st }, 201);
        } else {
            return return_error(1, "Unknown type");
        }
    },
};
