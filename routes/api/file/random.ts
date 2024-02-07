import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import { parse_bool } from "../../../server/parse_form.ts";
import { get_host } from "../../../server/utils.ts";
import { User, UserPermission } from "../../../db.ts";

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
        const is_nsfw = await parse_bool(u.searchParams.get("is_nsfw"), null);
        const is_ad = await parse_bool(u.searchParams.get("is_ad"), null);
        const thumb = await parse_bool(u.searchParams.get("thumb"), false);
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
        if (!f) return new Response("File not found.", { status: 404 });
        const t = thumb ? "thumbnail" : "file";
        return Response.redirect(`${get_host(req)}/api/${t}/${f.id}`);
    },
};
