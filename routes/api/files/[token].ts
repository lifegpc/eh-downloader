import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import type { EhFiles } from "../../../server/files.ts";
import { return_data, return_error } from "../../../server/utils.ts";
import { User, UserPermission } from "../../../db.ts";

export const handler: Handlers = {
    GET(_req, ctx) {
        const u = <User | undefined> ctx.state.user;
        if (u && !u.is_admin && !(u.permissions & UserPermission.ReadGallery)) {
            return return_error(403, "Permission denied.");
        }
        const tokens = ctx.params.token.split(",");
        const m = get_task_manager();
        const enable_server_timing = m.cfg.enable_server_timing;
        const start = enable_server_timing ? Date.now() : 0;
        const headers: HeadersInit = {};
        const data: EhFiles = {};
        for (const token of tokens) {
            data[token] = m.db.get_files(token).map((d) => {
                /**@ts-ignore */
                delete d.path;
                /**@ts-ignore */
                delete d.token;
                return d;
            });
        }
        if (enable_server_timing) {
            const end = Date.now();
            headers["Server-Timing"] = `db;dur=${end - start}`;
        }
        return return_data(data, 200, headers);
    },
};
