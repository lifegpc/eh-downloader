import { Handlers } from "$fresh/server.ts";
import isEqual from "lodash/isEqual";
import pbkdf2Hmac from "pbkdf2-hmac";
import { decodeBase64 } from "@std/encoding/base64";
import { User } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { get_string, parse_int } from "../../../server/parse_form.ts";
import { return_data, return_error } from "../../../server/utils.ts";
import { cache_mutex, timestamp_cache } from "../token.ts";

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
        const oldp = await get_string(d.get("old"));
        if (!oldp) return return_error(2, "Old password is needed.");
        let old: Uint8Array | null = null;
        try {
            old = decodeBase64(oldp);
        } catch (_) {
            return return_error(
                3,
                "Failed to decode old password with base64.",
            );
        }
        if (old.length !== 64) {
            return return_error(3, "Old password need 64 bytes.");
        }
        const t = await parse_int(d.get("t"), null);
        if (t === null) return return_error(2, "t not specified.");
        const now = Date.now();
        if (t > now + 60000 || t < now - 60000) {
            return return_error(4, "Time is not corrected.");
        }
        const newp = await get_string(d.get("new"));
        if (!newp) return return_error(2, "New password not specified.");
        const pa = new Uint8Array(
            await pbkdf2Hmac(user.password, t.toString(), 1000, 64, "SHA-512"),
        );
        if (!isEqual(pa, old)) {
            return return_error(5, "Incorrect password");
        }
        await cache_mutex.acquire();
        try {
            timestamp_cache.clear_expired(user.username, now);
            if (timestamp_cache.is_in_cache(user.username, t)) {
                return return_error(6, "This request has been used.");
            }
            timestamp_cache.add(user.username, t);
        } finally {
            cache_mutex.release();
        }
        user.password = new Uint8Array(
            await pbkdf2Hmac(
                newp,
                "eh-downloader-salt",
                210000,
                64,
                "SHA-512",
            ),
        );
        const m = get_task_manager();
        m.db.update_user(user);
        return return_data(true);
    },
};
