import { Handlers } from "$fresh/server.ts";
import { Token, User, UserPermission } from "../../db.ts";
import { get_task_manager } from "../../server.ts";
import { get_string, parse_bool, parse_int } from "../../server/parse_form.ts";
import type { BUser } from "../../server/user.ts";
import { return_data, return_error } from "../../server/utils.ts";
import pbkdf2Hmac from "pbkdf2-hmac";

export const handler: Handlers = {
    async DELETE(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (user && !user.is_admin) {
            return return_error(403, "Permission denied.");
        }
        let data: FormData | null = null;
        try {
            data = await req.formData();
        } catch (_) {
            return return_error(3, "Invalid parameters.");
        }
        const id = await parse_int(data.get("id"), null);
        const username = await get_string(data.get("username"));
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
        if (us.id == 0) return return_error(6, "root user can not be deleted.");
        if (user && us.is_admin && user.id != 0) {
            return return_error(
                7,
                "Only root user can delete admin user.",
                403,
            );
        }
        m.db.delete_user(us.id);
        return return_data(true);
    },
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
    async PATCH(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (user && !user.is_admin) {
            return return_error(403, "Permission denied.");
        }
        let data: FormData | null = null;
        try {
            data = await req.formData();
        } catch (_) {
            return return_error(3, "Invalid parameters.");
        }
        const id = await parse_int(data.get("id"), null);
        const username = await get_string(data.get("username"));
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
        if (user && us.is_admin && user.id != 0 && user.id != us.id) {
            return return_error(
                4,
                "Only root user can change other admin user's inforamtion.",
                403,
            );
        }
        const password = await get_string(data.get("password"));
        const is_admin = await parse_bool(data.get("is_admin"), null);
        const revoke_token = await parse_bool(data.get("revoke_token"), false);
        let permissions: UserPermission | null = await parse_int(
            data.get("permissions"),
            null,
        );
        if (is_admin && !us.is_admin && user && user.id != 0) {
            return return_error(
                5,
                "Only root user can prompt non-admin user to admin user.",
                403,
            );
        }
        if (is_admin) permissions = UserPermission.All;
        if (username) {
            if (us.username != username && m.db.get_user_by_name(username)) {
                return return_error(2, "Please change to another name.");
            }
            us.username = username;
        }
        if (password) {
            const hpassword = new Uint8Array(
                await pbkdf2Hmac(
                    password,
                    "eh-downloader-salt",
                    210000,
                    64,
                    "SHA-512",
                ),
            );
            us.password = hpassword;
        }
        if (us.id != 0 && is_admin !== null) {
            us.is_admin = is_admin;
        }
        if (us.id != 0 && permissions !== null) {
            us.permissions = permissions;
        }
        m.db.update_user(us);
        if (revoke_token) {
            const token = <Token | undefined> ctx.state.token;
            let tid: number | undefined = undefined;
            if (user && us.id == user.id && token) tid = token.id;
            m.db.delete_user_token(us.id, tid);
        }
        return return_data<BUser>({
            id: us.id,
            is_admin: us.is_admin,
            permissions: us.permissions,
            username: us.username,
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
        if (is_admin && user && user.id != 0) {
            return return_error(8, "Only root user can add admin user.", 403);
        }
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
