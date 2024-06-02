import { Handlers } from "$fresh/server.ts";
import { exists } from "@std/fs/exists";
import { get_task_manager } from "../../../server.ts";
import { parse_int } from "../../../server/parse_form.ts";
import { generate_filename, ThumbnailConfig } from "../../../thumbnail/base.ts";
import { isNumNaN, parseBigInt, sure_dir } from "../../../utils.ts";
import {
    get_file_response,
    GetFileResponseOptions,
} from "../../../server/get_file_response.ts";
import pbkdf2Hmac from "pbkdf2-hmac";
import { encodeBase64 as encode } from "@std/encoding/base64";
import { SortableURLSearchParams } from "../../../server/SortableURLSearchParams.ts";

export const handler: Handlers = {
    async GET(req, ctx) {
        const id = parseBigInt(ctx.params.id);
        if (isNumNaN(id)) {
            return new Response("Bad Request", { status: 400 });
        }
        const m = get_task_manager();
        const b = m.cfg.thumbnail_dir;
        await sure_dir(b);
        if (!m.cfg.img_verify_secret) {
            return new Response("Can not verify.", { status: 400 });
        }
        // U2 存在将 & 错误的编码为 &amp; 的BUG
        const tmp = ctx.params.verify.replaceAll("&amp;", "&");
        const search = new URLSearchParams(tmp);
        const verify = search.get("verify");
        if (!verify) return new Response("Verify is needed.", { status: 400 });
        const bs = new SortableURLSearchParams(tmp, ["verify"]);
        const tverify = encode(
            new Uint8Array(
                await pbkdf2Hmac(
                    `${id}${bs.toString2()}`,
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
        const width = await parse_int(search.get("width"), null);
        const height = await parse_int(search.get("height"), null);
        const quality = await parse_int(search.get("quality"), null);
        const method = await parse_int(search.get("method"), null);
        const align = await parse_int(search.get("align"), null);
        if (
            width === null || height === null || quality === null ||
            method === null || align === null
        ) {
            return new Response("params is missing", { status: 400 });
        }
        const f = m.db.get_file(id);
        if (!f) {
            return new Response("File not found.", { status: 404 });
        }
        const cfg: ThumbnailConfig = {
            width,
            height,
            quality,
            method,
            align,
        };
        const output = generate_filename(b, f, cfg);
        if (!(await exists(output))) {
            return new Response("file not exists.", { status: 500 });
        }
        const opts: GetFileResponseOptions = {};
        opts.cache_control = "public, no-transform, max-age=31536000";
        opts.range = req.headers.get("range");
        opts.if_modified_since = req.headers.get("If-Modified-Since");
        opts.if_unmodified_since = req.headers.get("If-Unmodified-Since");
        return await get_file_response(output, opts);
    },
};
