import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import { parse_bool } from "../../../server/parse_form.ts";
import { SortableURLSearchParams } from "../../../server/SortableURLSearchParams.ts";
import { get_host } from "../../../server/utils.ts";
import { User, UserPermission } from "../../../db.ts";
import pbkdf2Hmac from "pbkdf2-hmac";
import { encodeBase64 as encode } from "@std/encoding/base64";
import { return_data } from "../../../server/utils.ts";

export const handler: Handlers = {
    async GET(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (
            user && !user.is_admin &&
            !(user.permissions & UserPermission.ReadGallery)
        ) {
            return new Response("Permission denied", { status: 403 });
        }
        const m = get_task_manager();
        const u = new URL(req.url);
        const token = u.searchParams.get("token");
        const action = u.searchParams.get("action");
        if (token && m.cfg.random_file_secret) {
            const s = new SortableURLSearchParams(u.search, ["token"]);
            const r = encode(
                new Uint8Array(
                    await pbkdf2Hmac(
                        `${s.toString2()}`,
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
        if (action == "gentoken") {
            if (!m.cfg.random_file_secret) {
                return new Response("Random file secret is not enabled.", {
                    status: 400,
                });
            }
            const s = new SortableURLSearchParams(u.search, [
                "token",
                "action",
            ]);
            const token = encode(
                new Uint8Array(
                    await pbkdf2Hmac(
                        `${s.toString2()}`,
                        m.cfg.random_file_secret,
                        1000,
                        64,
                        "SHA-512",
                    ),
                ),
            );
            const b = new URLSearchParams(u.search);
            b.delete("action");
            b.set("token", token);
            return return_data(`${get_host(req)}/api/file/random?${b}`);
        }
        const is_nsfw = await parse_bool(u.searchParams.get("is_nsfw"), null);
        const is_ad = await parse_bool(u.searchParams.get("is_ad"), null);
        const thumb = await parse_bool(u.searchParams.get("thumb"), false);
        const svg = await parse_bool(u.searchParams.get("svg"), false);
        const jpn_title = await parse_bool(
            u.searchParams.get("jpn_title"),
            false,
        );
        const tgids = u.searchParams.get("gids");
        let gids = tgids
            ? new Set(
                tgids.split(",").map((x) => parseInt(x)).filter((v) =>
                    !isNaN(v)
                ),
            )
            : null;
        const meili_query = u.searchParams.get("meili_query");
        const meili_filter = u.searchParams.get("meili_filter");
        if (meili_query || meili_filter) {
            if (!m.meilisearch) {
                return new Response("Meilisearch is not enabled.", {
                    status: 400,
                });
            }
            try {
                const index = await m.meilisearch.gmeta;
                const re = await index.search(meili_query, {
                    filter: meili_filter || undefined,
                    hitsPerPage: 1000,
                    attributesToRetrieve: ["gid"],
                });
                if (gids === null) {
                    gids = new Set<number>();
                }
                re.hits.forEach((d) => {
                    gids?.add(d.gid);
                });
            } catch (e) {
                return new Response(e.message, { status: 400 });
            }
        }
        const f = m.db.get_random_file(is_nsfw, is_ad, gids);
        let url: string | undefined = undefined;
        if (!f) return new Response("File not found.", { status: 404 });
        if (m.cfg.img_verify_secret && !thumb) {
            const verify = encode(
                new Uint8Array(
                    await pbkdf2Hmac(
                        `${f.id}`,
                        m.cfg.img_verify_secret,
                        1000,
                        64,
                        "SHA-512",
                    ),
                ),
            );
            const b = new URLSearchParams();
            b.append("verify", verify);
            url = `${get_host(req)}/file/${f.id}?${b}`;
        } else {
            const t = thumb ? "thumbnail" : "file";
            if (m.cfg.random_file_secret) {
                const token = encode(
                    new Uint8Array(
                        await pbkdf2Hmac(
                            `${f.id}`,
                            m.cfg.random_file_secret,
                            1000,
                            64,
                            "SHA-512",
                        ),
                    ),
                );
                const b = new URLSearchParams();
                b.append("token", token);
                url = `${get_host(req)}/api/${t}/${f.id}?${b}`;
            } else {
                url = `${get_host(req)}/api/${t}/${f.id}`;
            }
        }
        if (svg) {
            const pmeta = m.db.get_pmeta_by_token_only(f.token);
            let y = f.height + 17;
            const lines = pmeta.map((d) => {
                const g = m.db.get_gmeta_by_gid(d.gid);
                const title =
                    (jpn_title ? g?.title_jpn ?? g?.title : g?.title) ?? "";
                const t = `<text font-size="16" y="${y}"><a href="${
                    get_host(req)
                }/flutter/gallery/${d.gid}/page/${d.index}">${
                    title ? title + " - " : title
                }${d.name}</a> <a href="https://e-hentai.org/s/${d.token}/${d.gid}-${d.index}" target="_blank">EH</a></text>`;
                y += 23;
                return t;
            });
            const dom = `<svg width="${f.width}" height="${
                f.height + pmeta.length * 23
            }" xmlns="http://www.w3.org/2000/svg">
<a href="${url}"><image href="${url}" /></a>
${lines.join("\n")}
</svg>`;
            return new Response(dom, {
                headers: { "Content-Type": "image/svg+xml" },
            });
        }
        return Response.redirect(url);
    },
};
