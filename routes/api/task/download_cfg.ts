import { Handlers } from "$fresh/server.ts";
import { User, UserPermission } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { return_data, return_error } from "../../../server/utils.ts";
import type { DownloadConfig } from "../../../tasks/download.ts";

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
        return return_data<DownloadConfig>({
            download_original_img: m.cfg.download_original_img,
            max_download_img_count: m.cfg.max_download_img_count,
            max_retry_count: m.cfg.max_retry_count,
            mpv: m.cfg.mpv,
            remove_previous_gallery: m.cfg.remove_previous_gallery,
        });
    },
};
