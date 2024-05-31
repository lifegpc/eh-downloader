import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../server.ts";
import type { Task, TaskProgress } from "../../task.ts";
import type {
    TaskClientSocketData,
    TaskServerSocketData,
} from "../../server/task.ts";
import { ExitTarget } from "../../signal_handler.ts";
import { get_string, parse_big_int } from "../../server/parse_form.ts";
import { return_data, return_error } from "../../server/utils.ts";
import type { DownloadConfig } from "../../tasks/download.ts";
import type { ExportZipConfig } from "../../tasks/export_zip.ts";
import { User, UserPermission } from "../../db.ts";
import { toJSON } from "../../utils.ts";

export const handler: Handlers = {
    GET(req, ctx) {
        const u = <User | undefined> ctx.state.user;
        if (u && !u.is_admin && !(u.permissions & UserPermission.ManageTasks)) {
            return return_error(403, "Permission denied.");
        }
        const t = get_task_manager();
        const { socket, response } = Deno.upgradeWebSocket(req);
        const handle = (
            e: CustomEvent<Task | TaskProgress | { task: Task; error: string }>,
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
            t.removeEventListener("new_task", handle);
            t.removeEventListener("task_started", handle);
            t.removeEventListener("task_finished", handle);
            t.removeEventListener("task_progress", handle);
            t.removeEventListener("task_error", handle);
            t.removeEventListener("task_updated", handle);
            ExitTarget.removeEventListener("close", close_handle);
        };
        function sendMessage(mes: TaskServerSocketData) {
            if (socket.readyState === socket.OPEN) {
                socket.send(toJSON(mes));
            }
        }
        const interval = setInterval(() => {
            sendMessage({ type: "ping" });
        }, 30000);
        socket.onclose = () => {
            removeListener();
            clearInterval(interval);
        };
        socket.onerror = () => {
            removeListener();
            clearInterval(interval);
            console.error("WebSocket error.");
        };
        socket.onmessage = (e) => {
            try {
                const d: TaskClientSocketData = JSON.parse(e.data);
                if (d.type == "close") {
                    sendMessage({ type: "close" });
                    socket.close();
                } else if (d.type == "new_download_task") {
                    t.add_download_task(d.gid, d.token, d.cfg);
                } else if (d.type == "new_export_zip_task") {
                    t.add_export_zip_task(d.gid, d.cfg);
                } else if (d.type == "task_list") {
                    t.get_task_list().then((tasks) => {
                        sendMessage({
                            type: "tasks",
                            tasks,
                            running: t.get_running_task(),
                        });
                    });
                } else if (d.type == "ping") {
                    sendMessage({ type: "pong" });
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
            t.addEventListener("task_error", handle);
            t.addEventListener("task_updated", handle);
            ExitTarget.addEventListener("close", close_handle);
        };
        return response;
    },
    async PUT(req, ctx) {
        const u = <User | undefined> ctx.state.user;
        if (u && !u.is_admin && !(u.permissions & UserPermission.ManageTasks)) {
            return return_error(403, "Permission denied.");
        }
        const t = get_task_manager();
        let form: FormData | null = null;
        try {
            form = await req.formData();
        } catch (_) {
            return return_error(400, "Bad Request");
        }
        const typ = await get_string(form.get("type"));
        if (!typ) {
            return return_error(1, "type is required");
        }
        if (typ == "download") {
            const gid = await parse_big_int(form.get("gid"), null);
            const token = await get_string(form.get("token"));
            if (gid === null) {
                return return_error(2, "gid is required");
            }
            if (!token) {
                return return_error(3, "token is required");
            }
            const cfg = await get_string(form.get("cfg"));
            let dcfg: DownloadConfig | undefined = undefined;
            if (cfg) {
                try {
                    dcfg = JSON.parse(cfg);
                } catch (_) {
                    return return_error(4, "cfg is invalid");
                }
            }
            try {
                const task = await t.add_download_task(gid, token, dcfg, true);
                if (task === null) {
                    return return_error(6, "task is already in the list");
                }
                return return_data(task, 201);
            } catch (e) {
                return return_error(500, e.message);
            }
        } else if (typ == "export_zip") {
            const gid = await parse_big_int(form.get("gid"), null);
            if (gid === null) {
                return return_error(2, "gid is required");
            }
            const cfg = await get_string(form.get("cfg"));
            let dcfg: ExportZipConfig | undefined = undefined;
            if (cfg) {
                try {
                    dcfg = JSON.parse(cfg);
                } catch (_) {
                    return return_error(4, "cfg is invalid");
                }
            }
            try {
                const task = await t.add_export_zip_task(gid, dcfg);
                return return_data(task, 201);
            } catch (e) {
                return return_error(500, e.message);
            }
        } else {
            return return_error(5, "unknown type");
        }
    },
};
