import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import {
    get_file_response,
    GetFileResponseOptions,
} from "../../../server/get_file_response.ts";
import { get_string } from "../../../server/parse_form.ts";
import pbkdf2Hmac from "pbkdf2-hmac";
import { encode } from "std/encoding/base64.ts";
import { get_host } from "../../../server/utils.ts";

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
        if (m.cfg.img_verify_secret) {
            let verify = null;
            try {
                const form = await req.formData();
                verify = await get_string(form.get("verify"));
            } catch (_) {
                null;
                const u = new URL(req.url);
                verify = u.searchParams.get("verify");
            }
            const tverify = encode(
                new Uint8Array(
                    await pbkdf2Hmac(
                        `id`,
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
                    `${get_host(req)}/api/file/${f.id}?${b}`,
                );
            }
            if (verify !== tverify) {
                return new Response("Invalid verify.", { status: 400 });
            }
        }
        opts.cache_control = "public, max-age=31536000";
        opts.range = req.headers.get("range");
        opts.if_modified_since = req.headers.get("If-Modified-Since");
        opts.if_unmodified_since = req.headers.get("If-Unmodified-Since");
        return await get_file_response(f.path, opts);
    },
};
