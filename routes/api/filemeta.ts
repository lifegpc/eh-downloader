import { Handlers } from "$fresh/server.ts";
import type { EhFileMeta } from "../../db.ts";
import { get_task_manager } from "../../server.ts";
import { get_string, parse_bool, parse_int } from "../../server/parse_form.ts";
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

export function put_gallery_filemeta(
    gid: number,
    is_nsfw: boolean,
    is_ad: boolean,
    excludes: Set<string>,
) {
    const m = get_task_manager();
    const tokens = new Set(m.db.get_pmeta(gid).map((d) => d.token));
    for (const token of tokens) {
        if (excludes.has(token)) continue;
        m.db.add_filemeta({ token, is_nsfw, is_ad });
    }
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
        const ct = req.headers.get("Content-Type")?.split(";")[0].trim() || "";
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
            } else if (typeof b.gid === "number") {
                if (
                    typeof b.is_nsfw === "boolean" &&
                    typeof b.is_ad === "boolean"
                ) {
                    const excludes: Set<string> = Array.isArray(b.excludes) &&
                            // @ts-ignore Any
                            b.excludes.every((d) => typeof d === "string")
                        ? new Set(b.excludes)
                        : new Set();
                    return put_gallery_filemeta(
                        b.gid,
                        b.is_nsfw,
                        b.is_ad,
                        excludes,
                    );
                } else return return_error(3, "Invalid parameters.");
            } else if (
                Array.isArray(b.tokens) &&
                // @ts-ignore Any
                b.tokens.every((d) => typeof d === "string")
            ) {
                if (
                    typeof b.is_nsfw === "boolean" &&
                    typeof b.is_ad === "boolean"
                ) {
                    const m = get_task_manager();
                    for (const token of b.tokens) {
                        m.db.add_filemeta({
                            token,
                            is_nsfw: b.is_nsfw,
                            is_ad: b.is_ad,
                        });
                    }
                    return return_data({});
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
            const gid = await parse_int(d.get("gid"), null);
            const is_nsfw = await parse_bool(d.get("is_nsfw"), null);
            const is_ad = await parse_bool(d.get("is_ad"), null);
            const tokens = await get_string(d.get("tokens"));
            if (is_nsfw === null || is_ad === null) {
                return return_error(3, "Invalid parameters.");
            }
            if (token) {
                return put_filemeta({ token, is_nsfw, is_ad });
            } else if (gid !== null) {
                const e = await get_string(d.get("excludes"));
                const excludes = e ? new Set(e.split(",")) : new Set<string>();
                return put_gallery_filemeta(gid, is_nsfw, is_ad, excludes);
            } else if (tokens) {
                const ts = new Set(tokens.split(","));
                const m = get_task_manager();
                for (const token of ts) {
                    m.db.add_filemeta({ token, is_nsfw, is_ad });
                }
                return return_data({});
            }
        }
        return return_error(4, "Unknown format.");
    },
};
