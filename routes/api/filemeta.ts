import { Handlers } from "$fresh/server.ts";
import { EhFileMeta } from "../../db.ts";
import { get_task_manager } from "../../server.ts";
import { get_string, parse_bool } from "../../server/parse_form.ts";
import { return_data, return_error } from "../../server/utils.ts";

export function get_filemeta(token: string) {
    const m = get_task_manager();
    const f = m.db.get_filemeta(token);
    if (!f) {
        const f = m.db.get_files(token);
        if (f.length) {
            return return_data<EhFileMeta>({
                token,
                is_nsfw: false,
                is_ad: false,
            });
        } else {
            return return_error(404, "file not found.");
        }
    }
    return return_data(f);
}

export function put_filemeta(d: EhFileMeta) {
    const m = get_task_manager();
    m.db.add_filemeta(d);
    return return_data({});
}

export const handler: Handlers = {
    GET(req, _ctx) {
        const u = new URL(req.url);
        const token = u.searchParams.get("token");
        if (token) return get_filemeta(token);
        return return_error(400, "token is needed.");
    },
    async PUT(req, _ctx) {
        const ct = req.headers.get("Content-Type").split(";")[0].trim() || "";
        if (ct === "application/json") {
            if (!req.body) return_error(1, "Body not found.");
            let b = null;
            try {
                b = await req.json();
            } catch (_) {
                return return_error(2, "Invaild JSON file.");
            }
            if (typeof b.token === "string") {
                if (
                    typeof b.is_nsfw === "boolean" &&
                    typeof b.is_ad === "boolean"
                ) {
                    return put_filemeta(b);
                } else return return_error(3, "Invalid parameters.");
            }
            return return_error(5, "Unknown JSON format.");
        } else if (
            ct === "application/x-www-form-urlencoded" ||
            ct === "multipart/form-data"
        ) {
            let d: FormData | null = null;
            try {
                d = await req.formData();
            } catch (_) {
                return return_error(3, "Invalid parameters.");
            }
            const token = await get_string(d.get("token"));
            if (token) {
                const is_nsfw = await parse_bool(d.get("is_nsfw"), null);
                const is_ad = await parse_bool(d.get("is_ad"), null);
                if (is_nsfw === null || is_ad === null) {
                    return return_error(3, "Invalid parameters.");
                }
                return put_filemeta({ token, is_nsfw, is_ad });
            }
        }
        return return_error(4, "Unknown format.");
    },
};
