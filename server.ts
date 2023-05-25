import { start } from "$fresh/server.ts";
import { Config } from "./config.ts";
import manifest from "./fresh.gen.ts";
import { TaskManager } from "./task_manager.ts";

let task_manager: TaskManager | undefined = undefined;

export function get_task_manager() {
    if (!task_manager) throw Error("task manager undefined.");
    return task_manager;
}

export function startServer(cfg: Config) {
    task_manager = new TaskManager(cfg);
    return start(manifest, {});
}
