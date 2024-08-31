import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import {
    get_file_response,
    GetFileResponseOptions,
} from "../../../server/get_file_response.ts";
import { parse_bool } from "../../../server/parse_form.ts";
import pbkdf2Hmac from "pbkdf2-hmac";
import { encodeBase64 as encode } from "@std/encoding/base64";
import { get_host, return_data, return_error } from "../../../server/utils.ts";
import type { EhFileExtend } from "../../../server/files.ts";
import {
    SharedToken,
    SharedTokenType,
    User,
    UserPermission,
} from "../../../db.ts";
import { SortableURLSearchParams } from "../../../server/SortableURLSearchParams.ts";
import { compareNum, isNumNaN, parseBigInt } from "../../../utils.ts";
import { extname } from "@std/path";

export const handler: Handlers = {
    async GET(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (
            user && !user.is_admin &&
            !(Number(user.permissions) & UserPermission.ReadGallery)
        ) {
            return return_error(403, "Permission denied.");
        }
        const st = <SharedToken | undefined> ctx.state.shared_token;
        const u = new URL(req.url);
        const m = get_task_manager();
        const token = u.searchParams.get("token");
        const data = await parse_bool(u.searchParams.get("data"), false);
        const id = parseBigInt(ctx.params.id);
        if (token && m.cfg.random_file_secret) {
            const s = new SortableURLSearchParams(u.search, ["token"]);
            const r = encode(
                new Uint8Array(
                    await pbkdf2Hmac(
                        `${id}${s.toString2()}`,
                        m.cfg.random_file_secret,
                        1000,
                        64,
                        "SHA-512",
                    ),
                ),
            );
            if (token !== r) {
                return new Response("Invalid token", { status: 403 });
            }
        }
        if (isNumNaN(id)) {
            if (data) return return_error(400, "Bad Request");
            return new Response("Bad Request", { status: 400 });
        }
        const f = m.db.get_file(id);
        if (!f) {
            if (st && st.type == SharedTokenType.Gallery) {
                if (data) return return_error(403, "Permission denied.");
                return new Response("Permission denied.", { status: 403 });
            }
            if (data) return return_error(404, "File not found.");
            return new Response("File not found.", { status: 404 });
        }
        if (st && st.type == SharedTokenType.Gallery) {
            const pmetas = m.db.get_pmeta_by_token_only(f.token);
            if (!pmetas.some((m) => !compareNum(m.gid, st.info.gid))) {
                if (data) return return_error(403, "Permission denied.");
                return new Response("Permission denied.", { status: 403 });
            }
        }
        if (data) {
            return return_data<EhFileExtend>({
                id: f.id,
                height: f.height,
                width: f.width,
                is_original: f.is_original,
                token: f.token,
            });
        }
        const opts: GetFileResponseOptions = {};
        if (m.cfg.img_verify_secret) {
            const verify = u.searchParams.get("verify");
            const tverify = encode(
                new Uint8Array(
                    await pbkdf2Hmac(
                        `${id}`,
                        m.cfg.img_verify_secret,
                        1000,
                        64,
                        "SHA-512",
                    ),
                ),
            );
            if (verify === null) {
                if (m.cfg.use_path_based_img_url) {
                    const ext = extname(f.path);
                    return Response.redirect(
                        `${get_host(req)}/file/${
                            encodeURIComponent(tverify)
                        }/${f.id}${ext}`,
                    );
                }
                const b = new URLSearchParams();
                b.append("verify", tverify);
                return Response.redirect(
                    `${get_host(req)}/file/${f.id}?${b}`,
                );
            }
        }
        opts.range = req.headers.get("range");
        opts.if_modified_since = req.headers.get("If-Modified-Since");
        opts.if_unmodified_since = req.headers.get("If-Unmodified-Since");
        return await get_file_response(f.path, opts);
    },
};
