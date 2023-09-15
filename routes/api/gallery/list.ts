import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import { parse_bool, parse_int } from "../../../server/parse_form.ts";
import { return_data, return_error } from "../../../server/utils.ts";

const ALLOW_FIELDS = [
    "gid",
    "token",
    "title",
    "title_jpn",
    "category",
    "uploader",
    "posted",
    "filecount",
    "filesize",
    "expunged",
    "rating",
    "parent_gid",
    "parent_key",
    "first_gid",
    "first_key",
];

export const handler: Handlers = {
    async GET(req, _ctx) {
        const u = new URL(req.url);
        const t = get_task_manager();
        const all = await parse_bool(u.searchParams.get("all"), false);
        const offset = await parse_int(u.searchParams.get("offset"), 0);
        const limit = await parse_int(u.searchParams.get("limit"), 20);
        const fields = u.searchParams.get("fields") || "*";
        const sort_by_gid = await parse_bool(
            u.searchParams.get("sort_by_gid"),
            null,
        );
        const uploader = u.searchParams.get("uploader");
        const tag = u.searchParams.get("tag");
        if (fields !== "*") {
            const fs = fields.split(",");
            const ok = fs.every((d) => {
                const c = d.trim();
                return ALLOW_FIELDS.includes(c);
            });
            if (!ok) return return_error(1, "Some fields not allowed.");
        }
        if (all) {
            return return_data(
                t.db.get_gmetas_all(fields, sort_by_gid, uploader, tag),
            );
        } else {
            return return_data(
                t.db.get_gmetas(
                    offset,
                    limit,
                    fields,
                    sort_by_gid,
                    uploader,
                    tag,
                ),
            );
        }
    },
};
