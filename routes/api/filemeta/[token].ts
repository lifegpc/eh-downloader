import { Handlers } from "$fresh/server.ts";
import { return_error } from "../../../server/utils.ts";
import { get_filemeta } from "../filemeta.ts";
import { User, UserPermission } from "../../../db.ts";

export const handler: Handlers = {
    GET(_req, ctx) {
        const u = <User | undefined> ctx.state.user;
        if (u && !u.is_admin && !(u.permissions & UserPermission.ReadGallery)) {
            return return_error(403, "Permission denied.");
        }
        const token = ctx.params.token;
        if (token) return get_filemeta(token);
        return return_error(400, "token is needed.");
    },
};
