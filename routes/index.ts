import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../server.ts";
import { get_host } from "../server/utils.ts";
import { exists } from "std/fs/exists.ts";

export const handler: Handlers = {
    async GET(req, _ctx) {
        const m = get_task_manager();
        if (m.cfg.redirect_to_flutter) {
            let flutter_base = import.meta.resolve("../static/flutter").slice(
                7,
            );
            if (Deno.build.os === "windows") {
                flutter_base = flutter_base.slice(1);
            }
            if (m.cfg.flutter_frontend) {
                flutter_base = m.cfg.flutter_frontend;
            }
            if (!await exists(flutter_base)) {
                return new Response("404 Not Found", { status: 404 });
            }
            return Response.redirect(`${get_host(req)}/flutter/`);
        }
        return new Response("404 Not Found", { status: 404 });
    },
};
