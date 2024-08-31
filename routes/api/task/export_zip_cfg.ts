import { Handlers } from "$fresh/server.ts";
import { User, UserPermission } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { return_data, return_error } from "../../../server/utils.ts";
import type { ExportZipConfig } from "../../../tasks/export_zip.ts";

export const handler: Handlers = {
    GET(_req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (
            user && !user.is_admin &&
            !(Number(user.permissions) & UserPermission.ManageTasks)
        ) {
            return return_error(403, "Permission denied.");
        }
        const m = get_task_manager();
        return return_data<ExportZipConfig>({
            jpn_title: m.cfg.export_zip_jpn_title,
        });
    },
};
