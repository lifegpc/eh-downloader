import { Handlers } from "$fresh/server.ts";
import { ConfigType, load_settings, save_settings } from "../../config.ts";
import { get_cfg_path, get_task_manager } from "../../server.ts";
import { parse_bool } from "../../server/parse_form.ts";
import { return_json } from "../../server/utils.ts";

const UNSAFE_TYPE: (keyof ConfigType)[] = [
    "base",
    "db_path",
    "port",
    "hostname",
    "meili_host",
    "meili_search_api_key",
    "meili_update_api_key",
];
const UNSAFE_TYPE2 = UNSAFE_TYPE as string[];

export const handler: Handlers = {
    async GET(req, _ctx) {
        const u = new URL(req.url);
        const current = await parse_bool(u.searchParams.get("current"), false);
        if (current) {
            const t = get_task_manager();
            return return_json(t.cfg.to_json());
        }
        const path = get_cfg_path();
        const cfg = await load_settings(path);
        return return_json(cfg.to_json());
    },
    async POST(req, _ctx) {
        const content_type = req.headers.get("Content-Type");
        if (content_type === "application/json") {
            const d = await req.json();
            const path = get_cfg_path();
            const m = get_task_manager();
            let is_unsafe = false;
            const cfg = await load_settings(path);
            Object.getOwnPropertyNames(d).forEach((k) => {
                if (UNSAFE_TYPE2.indexOf(k) === -1) {
                    cfg._data[k] = d[k];
                    m.cfg._data[k] = d[k];
                } else {
                    cfg._data[k] = d[k];
                    is_unsafe = true;
                }
            });
            await save_settings(path, cfg, m.force_aborts);
            return return_json({ is_unsafe });
        } else {
            return new Response("Bad Request", { status: 400 });
        }
    },
};
