import { Handlers } from "$fresh/server.ts";
import { exists } from "@std/fs/exists";
import { SharedTokenType, User, UserPermission } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { get_string, parse_big_int } from "../../../server/parse_form.ts";
import { get_host, return_data, return_error } from "../../../server/utils.ts";

export const handler: Handlers = {
    async GET(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        const u = new URL(req.url);
        const typ = await get_string(u.searchParams.get("type"));
        if (typ == "gallery") {
            if (
                user && !user.is_admin &&
                !(Number(user.permissions) & UserPermission.ShareGallery)
            ) {
                return return_error(403, "Permission denied.");
            }
            const gid = await parse_big_int(u.searchParams.get("gid"), null);
            const m = get_task_manager();
            let flutter_base = import.meta.resolve("../../../static/flutter")
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
            const data = m.db.list_shared_tokens(
                SharedTokenType.Gallery,
                gid ? { gid } : null,
            ).map((st) => {
                const token2 = encodeURIComponent(st.token);
                const gid = st.info.gid;
                const url = existed
                    ? `${base}/gallery/${gid}?share=${token2}`
                    : `https://dev.ehf.lifegpc.com/#/gallery/${gid}?base=${
                        encodeURIComponent(base)
                    }&share=${token2}`;
                return { url, token: st };
            });
            return return_data(data);
        } else {
            return return_error(1, "Unknown type");
        }
    },
};
