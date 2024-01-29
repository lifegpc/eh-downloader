import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../server.ts";
import {
    get_file_response,
    GetFileResponseOptions,
} from "../../server/get_file_response.ts";
import pbkdf2Hmac from "pbkdf2-hmac";
import { encodeBase64 as encode } from "std/encoding/base64.ts";

export const handler: Handlers = {
    async GET(req, ctx) {
        const id = parseInt(ctx.params.id);
        if (isNaN(id)) {
            return new Response("Bad Request", { status: 400 });
        }
        const m = get_task_manager();
        const u = new URL(req.url);
        if (!m.cfg.img_verify_secret) {
            return new Response("Can not verify.", { status: 400 });
        }
        const verify = u.searchParams.get("verify");
        if (!verify) return new Response("Verify is needed.", { status: 400 });
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
        if (verify !== tverify) {
            return new Response("verify is invalid.", { status: 400 });
        }
        const f = m.db.get_file(id);
        if (!f) {
            return new Response("File not found.", { status: 404 });
        }
        const opts: GetFileResponseOptions = {};
        opts.cache_control = "public, no-transform, max-age=31536000";
        opts.range = req.headers.get("range");
        opts.if_modified_since = req.headers.get("If-Modified-Since");
        opts.if_unmodified_since = req.headers.get("If-Unmodified-Since");
        return await get_file_response(f.path, opts);
    },
};
