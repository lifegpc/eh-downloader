import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../../server.ts";
import {
    gen_data,
    gen_error,
    JSONResult,
    return_data,
    return_error,
} from "../../../../server/utils.ts";
import { GMeta, User, UserPermission } from "../../../../db.ts";
import { isNumNaN, parseBigInt } from "../../../../utils.ts";

export const handler: Handlers = {
    GET(_req, ctx) {
        const u = <User | undefined> ctx.state.user;
        if (
            u && !u.is_admin &&
            !(u.permissions & UserPermission.ReadGallery ||
                u.permissions & UserPermission.ManageTasks)
        ) {
            return return_error(403, "Permission denied.");
        }
        const gids = new Set(
            ctx.params.gids.split(",").map((v) => parseBigInt(v)).filter((v) =>
                !isNumNaN(v)
            ).map((v) => BigInt(v)),
        );
        const m = get_task_manager();
        const re: Record<string, JSONResult<GMeta>> = {};
        for (const gid of gids) {
            const meta = m.db.get_gmeta_by_gid(gid);
            if (meta) {
                re[gid.toString()] = gen_data(meta);
            } else {
                re[gid.toString()] = gen_error(404, "Not found");
            }
        }
        return return_data(re);
    },
};
