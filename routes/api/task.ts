import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../server.ts";
import { Task, TaskProgress } from "../../task.ts";
import { DiscriminatedUnion } from "../../utils.ts";

type EventMap = {
    close: Record<PropertyKey, never>;
    new_download_task: { gid: number; token: string };
};

type EventData = DiscriminatedUnion<"type", EventMap>;

export const handler: Handlers<Task[]> = {
    GET(req, _ctx) {
        const t = get_task_manager();
        const { socket, response } = Deno.upgradeWebSocket(req);
        const handle = (e: CustomEvent<Task | TaskProgress>) => {
            socket.send(JSON.stringify({ type: e.type, detail: e.detail }));
        };
        const removeListener = () => {
            t.removeEventListener("new_task", handle);
            t.removeEventListener("task_started", handle);
            t.removeEventListener("task_finished", handle);
            t.removeEventListener("task_progress", handle);
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
                const d: EventData = JSON.parse(e.data);
                if (d.type == "close") {
                    socket.close();
                } else if (d.type == "new_download_task") {
                    t.add_download_task(d.gid, d.token);
                }
            } catch (_) {
                null;
            }
        };
        socket.onopen = () => {
            t.addEventListener("new_task", handle);
            t.addEventListener("task_started", handle);
            t.addEventListener("task_finished", handle);
            t.addEventListener("task_progress", handle);
        };
        return response;
    },
};
