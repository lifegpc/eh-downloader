import { Handlers } from "$fresh/server.ts";
import { exists } from "std/fs/exists.ts";
import { get_task_manager } from "../../server.ts";
import { parse_int } from "../../server/parse_form.ts";
import { generate_filename, ThumbnailConfig } from "../../thumbnail/base.ts";
import { sure_dir } from "../../utils.ts";
import {
    get_file_response,
    GetFileResponseOptions,
} from "../../server/get_file_response.ts";
import pbkdf2Hmac from "pbkdf2-hmac";
import { encode } from "std/encoding/base64.ts";
import { SortableURLSearchParams } from "../../server/SortableURLSearchParams.ts";

export const handler: Handlers = {
    async GET(req, ctx) {
        const id = parseInt(ctx.params.id);
        if (isNaN(id)) {
            return new Response("Bad Request", { status: 400 });
        }
        const m = get_task_manager();
        const b = m.cfg.thumbnail_dir;
        await sure_dir(b);
        const f = m.db.get_file(id);
        if (!f) {
            return new Response("File not found.", { status: 404 });
        }
        const u = new URL(req.url);
        if (!m.cfg.img_verify_secret) {
            return new Response("Can not verify.", { status: 400 });
        }
        const verify = u.searchParams.get("verify");
        if (!verify) return new Response("Verify is needed.", { status: 400 });
        const bs = new SortableURLSearchParams(u.search, ["verify"]);
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
        const width = await parse_int(u.searchParams.get("width"), null);
        const height = await parse_int(u.searchParams.get("height"), null);
        const quality = await parse_int(u.searchParams.get("quality"), null);
        const method = await parse_int(u.searchParams.get("method"), null);
        const align = await parse_int(u.searchParams.get("align"), null);
        if (
            width === null || height === null || quality === null ||
            method === null || align === null
        ) {
            return new Response("params is missing", { status: 400 });
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
