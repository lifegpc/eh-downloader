import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import {
    get_file_response,
    GetFileResponseOptions,
} from "../../../server/get_file_response.ts";
import { parse_bool } from "../../../server/parse_form.ts";
import pbkdf2Hmac from "pbkdf2-hmac";
import { encode } from "std/encoding/base64.ts";
import { get_host, return_data } from "../../../server/utils.ts";
import type { EhFileExtend } from "../../../server/files.ts";

export const handler: Handlers = {
    async GET(req, ctx) {
        const id = parseInt(ctx.params.id);
        if (isNaN(id)) {
            return new Response("Bad Request", { status: 400 });
        }
        const m = get_task_manager();
        const u = new URL(req.url);
        const f = m.db.get_file(id);
        const data = await parse_bool(u.searchParams.get("data"), false);
        if (!f) {
            return new Response("File not found.", { status: 404 });
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
