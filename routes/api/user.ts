import { Handlers } from "$fresh/server.ts";
import { User, UserPermission } from "../../db.ts";
import { get_task_manager } from "../../server.ts";
import { get_string, parse_bool, parse_int } from "../../server/parse_form.ts";
import type { BUser } from "../../server/user.ts";
import { return_data, return_error } from "../../server/utils.ts";
import pbkdf2Hmac from "pbkdf2-hmac";

export const handler: Handlers = {
    async GET(req, ctx) {
        const u = new URL(req.url);
        const id = await parse_int(u.searchParams.get("id"), null);
        const username = u.searchParams.get("username");
        const user = <User | undefined> ctx.state.user;
        if (id === null && !username && !user) {
            return return_error(1, "user not specified.");
        }
        const m = get_task_manager();
        const us = id !== null
            ? m.db.get_user(id)
            : username
            ? m.db.get_user_by_name(username)
            : user;
        if (!us) return return_error(404, "User not found.");
        if (user && !user.is_admin && us.id !== user.id) {
            return return_error(403, "Permission denied.");
        }
        return return_data<BUser>({
            id: us.id,
            username: us.username,
            is_admin: us.is_admin,
            permissions: us.permissions,
        });
    },
    async PUT(req, ctx) {
        const data = await req.formData();
        const user = <User | undefined> ctx.state.user;
        if (user && !user.is_admin) {
            return return_error(403, "Permission denied.");
        }
        const name = await get_string(data.get("name"));
        const password = await get_string(data.get("password"));
        const is_admin = await parse_bool(data.get("is_admin"), false);
        let permissions: UserPermission = await parse_int(
            data.get("permissions"),
            UserPermission.None,
        );
        if (!name) return return_error(1, "name not specified.");
        if (!password) return return_error(1, "password not specified.");
        if (is_admin) permissions = UserPermission.All;
        const m = get_task_manager();
        if (m.db.get_user_by_name(name)) {
            return return_error(2, "Please change to another name.");
        }
        const hpassword = new Uint8Array(
            await pbkdf2Hmac(
                password,
                "eh-downloader-salt",
                210000,
                64,
                "SHA-512",
            ),
        );
        if (m.db.get_user_count() === 0) {
            m.db.add_root_user(name, hpassword);
            return return_data(0, 201);
        } else {
            const t = m.db.add_user({
                id: 0,
                username: name,
                password: hpassword,
                is_admin,
                permissions,
            });
            return return_data(t.id, 201);
        }
    },
};
