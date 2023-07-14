import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import type { GalleryData } from "../../../server/gallery.ts";
import { return_data, return_error } from "../../../server/utils.ts";

export const handler: Handlers = {
    GET(_req, ctx) {
        const gid = parseInt(ctx.params.gid);
        if (isNaN(gid)) {
            return return_error(400, "Failed to parse gid.");
        }
        const m = get_task_manager();
        const meta = m.db.get_gmeta_by_gid(gid);
        if (!meta) return return_error(404, "Gallery not found.");
        const data: GalleryData = {
            meta,
            tags: m.db.get_gtags_full(gid).sort((a, b) => a.id - b.id),
            pages: m.db.get_extended_pmeta(gid).sort((a, b) =>
                a.index - b.index
            ),
        };
        return return_data(data);
    },
};
