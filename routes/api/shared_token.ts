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
    async DELETE(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        let form: FormData | undefined;
        try {
            form = await req.formData();
        } catch (_) {
            return return_error(400, "Bad Request");
        }
        const typ = await get_string(form.get("type"));
        const token = await get_string(form.get("token"));
        if (!token) {
            return return_error(2, "token not specfied.");
        }
        if (typ == "gallery") {
            if (
                user && !user.is_admin &&
                !(Number(user.permissions) & UserPermission.ShareGallery)
            ) {
                return return_error(403, "Permission denied.");
            }
            const m = get_task_manager();
            m.db.delete_shared_token(token);
            return return_data(true);
        } else {
            return return_error(1, "Unknown type");
        }
    },
    GET(_req, ctx) {
        const st = <SharedToken | undefined> ctx.state.shared_token;
        if (!st) return return_error(1, "No token.");
        return return_data(st);
    },
    async PATCH(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        let form: FormData | undefined;
        try {
            form = await req.formData();
        } catch (_) {
            return return_error(400, "Bad Request");
        }
        const typ = await get_string(form.get("type"));
        const expired = await parse_int(form.get("expired"), null);
        const token = await get_string(form.get("token"));
        if (!token) {
            return return_error(2, "token not specfied.");
        }
        if (typ == "gallery") {
            if (
                user && !user.is_admin &&
                !(Number(user.permissions) & UserPermission.ShareGallery)
            ) {
                return return_error(403, "Permission denied.");
            }
            const m = get_task_manager();
            const st = m.db.update_shared_token(
                token,
                SharedTokenType.Gallery,
                expired === 0 ? undefined : expired,
            );
            if (!st) return return_error(404, "Not found");
            let flutter_base = import.meta.resolve("../../static/flutter")
                .slice(7);
            if (Deno.build.os === "windows") {
                flutter_base = flutter_base.slice(1);
            }
            if (m.cfg.flutter_frontend) {
                flutter_base = m.cfg.flutter_frontend;
            }
            const existed = await exists(flutter_base);
            const host = get_host(req);
            const base = host + (existed ? "/flutter" : "/api/");
            const token2 = encodeURIComponent(st.token);
            const gid = st.info.gid;
            const url = existed
                ? `${base}/gallery/${gid}?share=${token2}`
                : `https://dev.ehf.lifegpc.com/gallery/${gid}?base=${
                    encodeURIComponent(base)
                }&share=${token2}`;
            return return_data({ url, token: st });
        } else {
            return return_error(1, "Unknown type");
        }
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
                !(Number(user.permissions) & UserPermission.ShareGallery)
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
            const host = get_host(req);
            const base = host + (existed ? "/flutter" : "/api/");
            const token = encodeURIComponent(st.token);
            const url = existed
                ? `${base}/gallery/${gid}?share=${token}`
                : `https://dev.ehf.lifegpc.com/gallery/${gid}?base=${
                    encodeURIComponent(base)
                }&share=${token}`;
            return return_data({ url, token: st }, 201);
        } else {
            return return_error(1, "Unknown type");
        }
    },
};
