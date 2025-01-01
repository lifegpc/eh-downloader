import { Handlers } from "$fresh/server.ts";
import { return_data, return_error } from "../../../server/utils.ts";
import { User, UserPermission } from "../../../db.ts";
import { parse_big_int } from "../../../server/parse_form.ts";
import { base_logger } from "../../../utils/logger.ts";

export const handler: Handlers = {
    async GET(_req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (
            user && !user.is_admin &&
            !(Number(user.permissions) & UserPermission.QueryLog)
        ) {
            return return_error(403, "Permission denied.");
        }
        const id = await parse_big_int(ctx.params["id"], null);
        if (id === null) {
            return return_error(1, "id is required.");
        }
        const log = base_logger.get_log(id);
        if (!log) {
            return return_error(404, "log not found.");
        }
        return return_data(log);
    },
    async DELETE(_req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (
            user && !user.is_admin &&
            !(Number(user.permissions) & UserPermission.QueryLog)
        ) {
            return return_error(403, "Permission denied.");
        }
        const id = await parse_big_int(ctx.params["id"], null);
        if (id === null) {
            return return_error(1, "id is required.");
        }
        base_logger.delete_log(id);
        return return_data(true);
    },
};
