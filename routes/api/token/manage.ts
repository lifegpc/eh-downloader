import { Handlers } from "$fresh/server.ts";
import { User } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { parse_big_int, parse_bool } from "../../../server/parse_form.ts";
import { return_data, return_error } from "../../../server/utils.ts";

export const handler: Handlers = {
    async DELETE(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        let data: FormData | null = null;
        try {
            data = await req.formData();
        } catch (_) {
            return return_error(1, "Invalid parameters.");
        }
        const id = await parse_big_int(data.get("id"), null);
        if (id === null) {
            return return_error(2, "token id not specified.");
        }
        const m = get_task_manager();
        const token = m.db.get_token_by_id(id);
        if (!token) {
            return return_error(404, "Token not found.");
        }
        if (user) {
            if (!user.is_admin && user.id != token.uid) {
                return return_error(403, "Permission denied.");
            }
            if (user.is_admin && user.id != token.uid && user.id != 0) {
                const u = m.db.get_user(token.uid);
                if (!u) {
                    return return_error(404, "User not found.");
                }
                if (u.is_admin) {
                    return return_error(
                        3,
                        "Only root user can delete admin user's token.",
                        403,
                    );
                }
            }
        }
        m.db.delete_token(token.token);
        return return_data(true);
    },
    async GET(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        const data = new URL(req.url).searchParams;
        let uid = await parse_big_int(data.get("uid"), null);
        const offset = await parse_big_int(data.get("offset"), null);
        const limit = await parse_big_int(data.get("limit"), null);
        const all_user = await parse_bool(data.get("all_user"), false);
        if (all_user) {
            uid = null;
        }
        const m = get_task_manager();
        if (user) {
            if (!all_user && uid === null) uid = user.id;
            if (!user.is_admin && uid && user.id != uid) {
                return return_error(403, "Permission denied.");
            }
            if (user.is_admin && uid && user.id != uid && user.id != 0) {
                const u = m.db.get_user(uid);
                if (!u) {
                    return return_error(404, "User not found.");
                }
                if (u.is_admin) {
                    return return_error(
                        3,
                        "Only root user can get admin user's tokens.",
                        403,
                    );
                }
            }
            if (user.id != 0 && uid === null) {
                return return_error(
                    4,
                    "Only root user can get all user's tokens.",
                    403,
                );
            }
        }
        if (!all_user && uid === null) {
            return return_error(2, "User id not specified.");
        }
        return return_data(
            m.db.get_tokens(offset, limit, uid).map((e) => {
                // @ts-ignore Ignore
                delete e.token;
                return e;
            }),
        );
    },
};
