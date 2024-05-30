import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import { Tag, User, UserPermission } from "../../../db.ts";
import {
    gen_data,
    gen_error,
    JSONResult,
    return_data,
    return_error,
} from "../../../server/utils.ts";

export const handler: Handlers = {
    GET(_req, ctx) {
        const u = <User | undefined> ctx.state.user;
        if (u && !u.is_admin && !(u.permissions & UserPermission.ReadGallery)) {
            return return_error(403, "Permission denied.");
        }
        const ids = decodeURIComponent(ctx.params.id).split(",");
        const r: Record<string, JSONResult<Tag>> = {};
        for (const _id of ids) {
            const id = parseInt(_id);
            let key: string | undefined;
            let tag: string | undefined;
            if (isNaN(id)) {
                tag = _id;
            }
            const m = get_task_manager();
            let t: Tag | undefined;
            if (tag) {
                t = m.db.get_tag_by_tag(tag);
                key = tag;
            } else {
                t = m.db.get_tag(id);
                key = id.toString();
            }
            if (t) {
                r[key] = gen_data(t);
            } else {
                r[key] = gen_error(404, "tag not found.");
            }
        }
        return return_data(r);
    },
};
