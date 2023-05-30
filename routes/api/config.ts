import { Handlers } from "$fresh/server.ts";
import { ConfigType, load_settings, save_settings } from "../../config.ts";
import { get_cfg_path, get_task_manager } from "../../server.ts";

const UNSAFE_TYPE: (keyof ConfigType)[] = ["base", "db_path", "port"];
const UNSAFE_TYPE2 = UNSAFE_TYPE as string[];

export const handler: Handlers = {
    async GET(_req, _ctx) {
        const path = get_cfg_path();
        const cfg = await load_settings(path);
        return new Response(JSON.stringify(cfg.to_json()), {
            headers: { "Content-Type": "application/json" },
        });
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
            return new Response(JSON.stringify({ is_unsafe }), {
                headers: { "Content-Type": "application/json" },
            });
        } else {
            return new Response("Bad Request", { status: 400 });
        }
    },
};
