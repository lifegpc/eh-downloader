import { Handlers } from "$fresh/server.ts";
import { decode } from "std/encoding/base64.ts";
import { get_string, parse_int } from "../../server/parse_form.ts";
import { return_data, return_error } from "../../server/utils.ts";
import { get_task_manager } from "../../server.ts";
import pbkdf2Hmac from "pbkdf2-hmac";
import isEqual from "lodash/isEqual";

const USER_PASSWORD_ERROR = "Incorrect username or password.";

export const handler: Handlers = {
    async POST(req, _ctx) {
        const data = await req.formData();
        const username = await get_string(data.get("username"));
        if (!username) return return_error(1, "username not specified.");
        const p = await get_string(data.get("password"));
        if (!p) return return_error(1, "password not specified.");
        let password = null;
        try {
            password = decode(p);
        } catch (_) {
            return return_error(2, "Failed to decode password with base64.");
        }
        if (password.length !== 64) {
            return return_error(2, "Password need 64 bytes.");
        }
        const t = await parse_int(data.get("t"), null);
        if (t === null) return return_error(1, "t not specified.");
        const now = (new Date()).getTime();
        if (t > now + 60000 || t < now - 60000) {
            return return_error(3, "Time is not corrected.");
        }
        const m = get_task_manager();
        const u = m.db.get_user_by_name(username);
        if (!u) return return_error(4, USER_PASSWORD_ERROR);
        const pa = new Uint8Array(
            await pbkdf2Hmac(u.password, t.toString(), 1000, 64),
        );
        if (!isEqual(pa, password)) {
            return return_error(4, USER_PASSWORD_ERROR);
        }
        const token = m.db.add_token(u.id, now);
        return return_data(token);
    },
};
