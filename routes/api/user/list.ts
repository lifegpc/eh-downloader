import { Handlers } from "$fresh/server.ts";
import { User } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { parse_bool, parse_int } from "../../../server/parse_form.ts";
import { BUser } from "../../../server/user.ts";
import { return_data, return_error } from "../../../server/utils.ts";

export const handler: Handlers = {
    async GET(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (user && !user.is_admin) {
            return return_error(403, "Permission denied.");
        }
        const u = new URL(req.url);
        const all = await parse_bool(u.searchParams.get("all"), false);
        const offset = await parse_int(u.searchParams.get("offset"), 0);
        const limit = await parse_int(u.searchParams.get("limit"), 20);
        const m = get_task_manager();
        const users = all ? m.db.get_users() : m.db.get_users(limit, offset);
        return return_data(users.map((v) => {
            return <BUser> {
                id: v.id,
                is_admin: v.is_admin,
                permissions: v.permissions,
                username: v.username,
            };
        }));
    },
};
