import { Handlers } from "$fresh/server.ts";
import { exists } from "std/fs/exists.ts";
import { get_task_manager } from "../../../server.ts";
import { parse_bool, parse_int } from "../../../server/parse_form.ts";
import { generate_filename, ThumbnailConfig } from "../../../thumbnail/base.ts";
import { sure_dir } from "../../../utils.ts";
import { ThumbnailMethod } from "../../../config.ts";
import { fb_generate_thumbnail } from "../../../thumbnail/ffmpeg_binary.ts";
import {
    get_file_response,
    GetFileResponseOptions,
} from "../../../server/get_file_response.ts";
import { get_host } from "../../../server/utils.ts";
import pbkdf2Hmac from "pbkdf2-hmac";
import { encode } from "std/encoding/base64.ts";
import { SortableURLSearchParams } from "../../../server/SortableURLSearchParams.ts";

export const handler: Handlers = {
    async GET(req, ctx) {
        const id = parseInt(ctx.params.id);
        if (isNaN(id)) {
            return new Response("Bad Request", { status: 400 });
        }
        const m = get_task_manager();
        const b = m.cfg.thumbnail_dir;
        const method = m.cfg.thumbnail_method;
        await sure_dir(b);
        const f = m.db.get_file(id);
        if (!f) {
            return new Response("File not found.", { status: 404 });
        }
        const u = new URL(req.url);
        const max = await parse_int(u.searchParams.get("max"), 1200);
        const width = await parse_int(u.searchParams.get("width"), null);
        const height = await parse_int(u.searchParams.get("height"), null);
        const quality = await parse_int(u.searchParams.get("quality"), 1);
        const force = await parse_bool(u.searchParams.get("force"), false);
        const cfg: ThumbnailConfig = { width: 0, height: 0, quality };
        if (width !== null && height !== null) {
            cfg.width = width;
            cfg.height = height;
        } else if (width !== null) {
            cfg.width = width;
            cfg.height = Math.round(f.height / f.width * width);
        } else if (height !== null) {
            cfg.height = height;
            cfg.width = Math.round(f.width / f.height * height);
        } else {
            if (f.width > f.height) {
                cfg.width = max;
                cfg.height = Math.round(f.height / f.width * max);
            } else {
                cfg.height = max;
                cfg.width = Math.round(f.width / f.height * max);
            }
        }
        if (!force) {
            if (cfg.width > f.width || cfg.height > f.height) {
                return Response.redirect(`${get_host(req)}/api/file/${f.id}`);
            }
        }
        const output = generate_filename(b, f, cfg);
        if (!(await exists(output))) {
            if (method === ThumbnailMethod.FFMPEG_BINARY) {
                const re = await fb_generate_thumbnail(
                    m.cfg.ffmpeg_path,
                    f.path,
                    output,
                    cfg,
                );
                if (!re) {
                    return new Response("Failed to generate thumbnail.", {
                        status: 500,
                    });
                }
            }
        }
        const opts: GetFileResponseOptions = {};
        if (m.cfg.img_verify_secret) {
            const verify = u.searchParams.get("verify");
            if (verify === null) {
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
                const b = new URLSearchParams(bs.toString());
                b.append("verify", tverify);
                return Response.redirect(
                    `${get_host(req)}/thumbnail/${f.id}?${b}`,
                );
            }
        }
        opts.range = req.headers.get("range");
        opts.if_modified_since = req.headers.get("If-Modified-Since");
        opts.if_unmodified_since = req.headers.get("If-Unmodified-Since");
        return await get_file_response(output, opts);
    },
};
