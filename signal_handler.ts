import { TaskManager } from "./task_manager.ts";

export function add_exit_handler(m: TaskManager) {
    const handler = () => {
        m.close();
    };
    Deno.addSignalListener("SIGINT", handler);
}
