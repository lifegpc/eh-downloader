import { Handlers } from "$fresh/server.ts";
import { return_error } from "../../../server/utils.ts";
import { User, UserPermission } from "../../../db.ts";
import { base_logger, LogEntry } from "../../../utils/logger.ts";
import { ExitTarget } from "../../../signal_handler.ts";
import { toJSON } from "../../../utils.ts";

export type LogRealtimeClientData = { type: "ping" } | { type: "close" } | {
    type: "pong";
};

export const handler: Handlers = {
    GET(req, ctx) {
        const u = <User | undefined> ctx.state.user;
        if (
            u && !u.is_admin &&
            !(Number(u.permissions) & UserPermission.QueryLog)
        ) {
            return return_error(403, "Permission denied.");
        }
        const { socket, response } = Deno.upgradeWebSocket(req);
        const handle = (
            e: CustomEvent<LogEntry>,
        ) => {
            if (socket.readyState === socket.OPEN) {
                socket.send(toJSON({ type: e.type, detail: e.detail }));
            }
        };
        const close_handle = () => {
            sendMessage({ type: "close" });
            socket.close();
        };
        const removeListener = () => {
            base_logger.removeEventListener("new_log", handle);
            ExitTarget.removeEventListener("close", close_handle);
        };
        function sendMessage(mes: { type: string }) {
            if (socket.readyState === socket.OPEN) {
                socket.send(toJSON(mes));
            }
        }
        const interval = setInterval(() => {
            sendMessage({ type: "ping" });
        }, 30000);
        socket.onclose = () => {
            clearInterval(interval);
            removeListener();
        };
        socket.onmessage = (e) => {
            try {
                const d: LogRealtimeClientData = JSON.parse(e.data);
                if (d.type == "close") {
                    sendMessage({ type: "close" });
                    socket.close();
                } else if (d.type == "ping") {
                    sendMessage({ type: "pong" });
                }
            } catch (_) {
                null;
            }
        };
        base_logger.addEventListener("new_log", handle);
        ExitTarget.addEventListener("close", close_handle);
        return response;
    },
};
