import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../server.ts";
import { Task } from "../../task.ts";

export const handler: Handlers<Task[]> = {
    GET(req, _ctx) {
        const t = get_task_manager();
        const { socket, response } = Deno.upgradeWebSocket(req);
        const task_handle = (e: CustomEvent<Task>) => {
            socket.send(JSON.stringify({ type: e.type, detail: e.detail }));
        };
        const removeListener = () => {
            t.removeEventListener("new_task", task_handle);
            t.removeEventListener("task_started", task_handle);
            t.removeEventListener("task_finished", task_handle);
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
                } else if (d.type == "new_download_task") {
                    const gid = d.gid;
                    const token = d.token;
                    if (typeof gid !== "number" || typeof token !== "string") {
                        return;
                    }
                    t.add_download_task(gid, token);
                }
            } catch (_) {
                null;
            }
        };
        socket.onopen = () => {
            t.addEventListener("new_task", task_handle);
            t.addEventListener("task_started", task_handle);
            t.addEventListener("task_finished", task_handle);
        };
        return response;
    },
};
