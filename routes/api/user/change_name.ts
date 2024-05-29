import { Handlers } from "$fresh/server.ts";
import { User } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { get_string } from "../../../server/parse_form.ts";
import { BUser } from "../../../server/user.ts";
import { return_data, return_error } from "../../../server/utils.ts";

export const handler: Handlers = {
    async POST(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (!user) {
            return return_error(403, "Permission denied.");
        }
        let d: FormData | null = null;
        try {
            d = await req.formData();
        } catch (_) {
            return return_error(1, "Invalid parameters.");
        }
        const username = await get_string(d.get("username"));
        if (!username) return return_error(2, "User name not specified.");
        if (user.username == username) {
            return return_error(3, "Name not changed.");
        }
        const m = get_task_manager();
        const u = m.db.get_user_by_name(username);
        if (u) {
            return return_error(
                4,
                "User name is already used by other user, please use another name.",
            );
        }
        user.username = username;
        m.db.update_user(user);
        return return_data<BUser>({
            id: user.id,
            is_admin: user.is_admin,
            permissions: user.permissions,
            username: user.username,
        });
    },
};
