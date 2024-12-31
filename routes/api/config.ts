import { Handlers } from "$fresh/server.ts";
import { ConfigType, load_settings, save_settings } from "../../config.ts";
import { get_cfg_path, get_task_manager } from "../../server.ts";
import {
    ConfigClientSocketData,
    ConfigSeverSocketData,
} from "../../server/config.ts";
import { parse_bool } from "../../server/parse_form.ts";
import { return_json } from "../../server/utils.ts";
import { ExitTarget } from "../../signal_handler.ts";
import type { User } from "../../db.ts";
import { toJSON } from "../../utils.ts";
import { base_logger } from "../../utils/logger.ts";

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
const logger = base_logger.get_logger("api-config");

export const handler: Handlers = {
    async GET(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (user && !user.is_admin) {
            return new Response("Permission denied", { status: 403 });
        }
        const u = new URL(req.url);
        const current = await parse_bool(u.searchParams.get("current"), false);
        if (current) {
            const type = u.searchParams.get("type");
            const t = get_task_manager();
            if (type === "ws") {
                const { socket, response } = Deno.upgradeWebSocket(req);
                const handle = (e: CustomEvent<ConfigType>) => {
                    sendMessage({ type: "cfg", cfg: e.detail });
                };
                const sendMessage = (mes: ConfigSeverSocketData) => {
                    if (socket.readyState === socket.OPEN) {
                        socket.send(toJSON(mes));
                    }
                };
                const close_handle = () => {
                    sendMessage({ type: "close" });
                    socket.close();
                };
                const removeListener = () => {
                    t.removeEventListener("current_cfg_updated", handle);
                    ExitTarget.removeEventListener("close", close_handle);
                };
                socket.onclose = () => {
                    removeListener();
                };
                socket.onerror = () => {
                    removeListener();
                    logger.error("WebSocket error.");
                };
                socket.onmessage = (e) => {
                    try {
                        const d: ConfigClientSocketData = JSON.parse(e.data);
                        if (d.type == "close") {
                            sendMessage({ type: "close" });
                            socket.close();
                        }
                    } catch (_) {
                        null;
                    }
                };
                socket.onopen = () => {
                    t.addEventListener("current_cfg_updated", handle);
                    ExitTarget.addEventListener("close", close_handle);
                    sendMessage({ type: "cfg", cfg: t.cfg.to_json() });
                };
                return response;
            }
            return return_json(t.cfg.to_json());
        }
        const path = get_cfg_path();
        const cfg = await load_settings(path);
        return return_json(cfg.to_json());
    },
    async POST(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (user && !user.is_admin) {
            return new Response("Permission denied", { status: 403 });
        }
        const content_type = req.headers.get("Content-Type");
        if (content_type === "application/json") {
            const d = await req.json();
            const path = get_cfg_path();
            const m = get_task_manager();
            let is_unsafe = false;
            const cfg = await load_settings(path);
            let updated = false;
            Object.getOwnPropertyNames(d).forEach((k) => {
                if (d[k] === null) return;
                if (UNSAFE_TYPE2.indexOf(k) === -1) {
                    cfg._data[k] = d[k];
                    m.cfg._data[k] = d[k];
                    updated = true;
                } else {
                    cfg._data[k] = d[k];
                    is_unsafe = true;
                }
            });
            await save_settings(path, cfg, m.force_aborts);
            if (updated) {
                m.dispatchEvent("current_cfg_updated", m.cfg.to_json());
            }
            return return_json({ is_unsafe });
        } else {
            return new Response("Bad Request", { status: 400 });
        }
    },
};
