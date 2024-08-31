import { Handlers } from "$fresh/server.ts";
import { User, UserPermission } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { EHImageLimit } from "../../../server/eh.ts";
import { return_data, return_error } from "../../../server/utils.ts";

export const handler: Handlers = {
    async GET(_req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (
            user && !user.is_admin &&
            !(Number(user.permissions) & UserPermission.ManageTasks)
        ) {
            return return_error(403, "Permission denied.");
        }
        const m = get_task_manager();
        try {
            const re = await m.client.fetchHomeOverviewPage();
            if (re === null) {
                return return_error(1, "Not logged in.");
            }

            return return_data<EHImageLimit>({
                max: re.max_image_limit,
                current: re.current_image_limit,
            });
        } catch (e) {
            return return_error(500, e.message);
        }
    },
};
