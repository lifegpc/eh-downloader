import { Handlers } from "$fresh/server.ts";
import { ImportMethod } from "../../../config.ts";
import { User, UserPermission } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { return_data, return_error } from "../../../server/utils.ts";

export type DefaultImportConfig = {
    max_import_img_count?: number;
    mpv?: boolean;
    method?: ImportMethod;
    remove_previous_gallery?: boolean;
};

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
        return return_data<DefaultImportConfig>({
            max_import_img_count: m.cfg.max_import_img_count,
            method: m.cfg.import_method,
            mpv: m.cfg.mpv,
            remove_previous_gallery: m.cfg.remove_previous_gallery,
        });
    },
};
