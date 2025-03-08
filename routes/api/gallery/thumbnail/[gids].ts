import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../../server.ts";
import {
    gen_data,
    gen_error,
    JSONResult,
    return_data,
    return_error,
} from "../../../../server/utils.ts";
import { ExtendedPMeta, User, UserPermission } from "../../../../db.ts";
import { isNumNaN, parseBigInt } from "../../../../utils.ts";


export const handler: Handlers = {
    GET(_req, ctx) {
        const u = <User | undefined> ctx.state.user;
        if (
            u && !u.is_admin &&
            !(Number(u.permissions) & UserPermission.ReadGallery)
        ) {
            return return_error(403, "Permission denied.");
        }
        const gid = decodeURIComponent(ctx.params.gids);
        const gids = new Set(
            gid.split(",").map((v) => parseBigInt(v)).filter((v) =>
                !isNumNaN(v)
            ).map((v) => BigInt(v)),
        );
        const m = get_task_manager();
        const re: Record<string, JSONResult<ExtendedPMeta>> = {};
        for (const gid of gids) {
            const page = m.db.get_first_extended_pmeta(gid);
            if (page) {
                re[gid.toString()] = gen_data(page);
            } else {
                re[gid.toString()] = gen_error(404, "Not found");
            }
        }
        return return_data(re);
    },
};
