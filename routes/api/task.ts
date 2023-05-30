import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../server.ts";
import { Task } from "../../task.ts";

export const handler: Handlers<Task[]> = {
    GET(req, _ctx) {
        const t = get_task_manager();
        const { socket, response } = Deno.upgradeWebSocket(req);
        const new_task_handle = (e: CustomEvent<Task>) => {
            socket.send(JSON.stringify({ type: "new_task", detail: e.detail }));
        };
        const removeListener = () => {
            t.removeEventListener("new_task", new_task_handle);
        };
        socket.onclose = () => {
            removeListener();
        };
        socket.onerror = () => {
            removeListener();
            console.error("WebSocket error.");
        };
        socket.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data);
                if (d.type == "close") {
                    socket.close();
                }
            } catch (_) {
                null;
            }
        };
        socket.onopen = () => {
            t.addEventListener("new_task", new_task_handle);
        };
        return response;
    },
};
