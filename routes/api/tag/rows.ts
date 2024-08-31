import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import { return_data, return_error } from "../../../server/utils.ts";
import { User, UserPermission } from "../../../db.ts";

export const handler: Handlers = {
    GET(_req, _ctx) {
        const u = <User | undefined> _ctx.state.user;
        if (
            u && !u.is_admin &&
            !(Number(u.permissions) & UserPermission.ReadGallery)
        ) {
            return return_error(403, "Permission denied.");
        }
        const m = get_task_manager();
        return return_data(m.db.get_tag_rows());
    },
};
