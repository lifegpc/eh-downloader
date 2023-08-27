import { Handlers } from "$fresh/server.ts";
import { decode } from "std/encoding/base64.ts";
import { get_string, parse_bool, parse_int } from "../../server/parse_form.ts";
import { return_data, return_error } from "../../server/utils.ts";
import { get_task_manager } from "../../server.ts";
import pbkdf2Hmac from "pbkdf2-hmac";
import isEqual from "lodash/isEqual";
import type { Token } from "../../db.ts";

const USER_PASSWORD_ERROR = "Incorrect username or password.";

export const handler: Handlers = {
    async DELETE(req, ctx) {
        let t: string | undefined | null;
        try {
            const data = await req.formData();
            t = await get_string(data.get("token"));
        } catch (_) {
            null;
        }
        let is_from_auth = false;
        const ttoken = <Token | undefined> ctx.state.token;
        const is_from_cookie = <boolean | undefined> ctx.state.is_from_cookie;
        if (!t && ttoken) {
            t = ttoken.token;
            is_from_auth = true;
        }
        if (!t) return return_error(1, "token not specified.");
        const m = get_task_manager();
        const token = m.db.get_token(t);
        if (!token) return return_error(404, "token not found.");
        m.db.delete_token(t);
        const headers: HeadersInit = {};
        if (is_from_auth && is_from_cookie) {
            headers["Set-Cookie"] = `token=${token.token}; Max-Age=0${
                token.http_only ? "; HttpOnly" : ""
            }${token.secure ? "; Secure" : ""}; Path=/api`;
        }
        return return_data(true, 200, headers);
    },
    GET(req, ctx) {
        const u = new URL(req.url);
        let t = u.searchParams.get("token");
        const ttoken = <Token | undefined> ctx.state.token;
        if (!t && ttoken) t = ttoken.token;
        if (!t) return return_error(1, "token not specififed.");
        const m = get_task_manager();
        const token = m.db.get_token(t);
        if (!token) return return_error(404, "token not found.");
        const user = m.db.get_user(token.uid);
        if (!user) return return_error(404, "user not found.");
        return return_data({
            token,
            name: user.username,
            is_admin: user.is_admin,
            permissions: user.permissions,
        });
    },
    async PUT(req, _ctx) {
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
        const set_cookie = await parse_bool(data.get("set_cookie"), false);
        const http_only = await parse_bool(data.get("http_only"), true);
        const secure = await parse_bool(data.get("secure"), false);
        const m = get_task_manager();
        const u = m.db.get_user_by_name(username);
        if (!u) return return_error(4, USER_PASSWORD_ERROR);
        const pa = new Uint8Array(
            await pbkdf2Hmac(u.password, t.toString(), 1000, 64, "SHA-512"),
        );
        if (!isEqual(pa, password)) {
            return return_error(4, USER_PASSWORD_ERROR);
        }
        const token = m.db.add_token(u.id, now, http_only, secure);
        const headers: HeadersInit = {};
        if (set_cookie) {
            headers["Set-Cookie"] =
                `token=${token.token}; Expires=${token.expired.toUTCString()}${
                    http_only ? "; HttpOnly" : ""
                }${secure ? "; Secure" : ""}; Path=/api`;
        }
        return return_data(token, 201, headers);
    },
};
