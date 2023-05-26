import { Handlers } from "$fresh/server.ts";
import { load_settings } from "../../config.ts";
import { get_cfg_path } from "../../server.ts";

export const handler: Handlers = {
    async GET(_req, _ctx) {
        const path = get_cfg_path();
        const cfg = await load_settings(path);
        return new Response(JSON.stringify(cfg.to_json()), {
            headers: { "Content-Type": "application/json" },
        });
    },
};
