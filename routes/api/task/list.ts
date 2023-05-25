import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import { Task } from "../../../task.ts";

export const handler: Handlers<Task[]> = {
    async GET(_, _ctx) {
        const t = get_task_manager();
        const tasks = await t.db.get_tasks_by_pid(Deno.pid);
        return new Response(JSON.stringify(tasks), {
            headers: { "Content-Type": "application/json" },
        });
    },
};
