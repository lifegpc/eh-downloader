import { Client } from "./client.ts";
import { Config } from "./config.ts";
import { EhDb } from "./db.ts";
import { check_running } from "./pid_check.ts";
import { Task, TaskType } from "./task.ts";
import { download_task } from "./tasks/download.ts";
import { promiseState, PromiseStatus, sleep } from "./utils.ts";

export class TaskManager {
    client;
    db;
    running_tasks: Map<number, Promise<Task>>;
    max_task_count;
    constructor(cfg: Config) {
        this.client = new Client(cfg);
        this.db = new EhDb(cfg.base);
        this.running_tasks = new Map();
        this.max_task_count = cfg.max_task_count;
    }
    async add_download_task(gid: number, token: string) {
        const otask = await this.db.check_download_task(gid, token);
        if (otask !== undefined) {
            console.log("The task is already in list.");
            return otask;
        }
        const task: Task = {
            gid,
            token,
            id: 0,
            pid: Deno.pid,
            pn: 1,
            type: TaskType.Download,
        };
        return await this.db.add_task(task);
    }
    async check_task(task: Task) {
        if (await this.check_task_is_running(task)) return;
        let t = task;
        if (task.pid !== Deno.pid) {
            const p = await this.db.set_task_pid(t);
            if (p == null) return;
            t = p;
        }
        return t;
    }
    async check_task_is_running(task: Task) {
        if (task.pid == Deno.pid) {
            return this.running_tasks.has(task.id);
        } else {
            const r = await check_running(task.pid);
            return r === true;
        }
    }
    async check_running_tasks() {
        const removed_task: number[] = [];
        for (const [id, task] of this.running_tasks) {
            const status = await promiseState(task);
            if (status.status == PromiseStatus.Fulfilled && status.value) {
                removed_task.push(id);
                await this.db.delete_task(status.value);
            } else if (status.status == PromiseStatus.Rejected) {
                if (status.reason) console.log(status.reason);
                removed_task.push(id);
            }
        }
        for (const id of removed_task) {
            this.running_tasks.delete(id);
        }
    }
    close() {
        this.db.close();
    }
    async run() {
        while (1) {
            await this.check_running_tasks();
            if (this.running_tasks.size == this.max_task_count) {
                await sleep(1000);
                continue;
            }
            const my_tasks = await this.db.get_tasks_by_pid(Deno.pid);
            for (const task of my_tasks) {
                if (this.running_tasks.size == this.max_task_count) break;
                const checked = await this.check_task(task);
                if (checked) this.run_task(checked);
            }
            if (this.running_tasks.size == this.max_task_count) continue;
            const otasks = await this.db.get_other_pid_tasks();
            for (const task of otasks) {
                if (this.running_tasks.size == this.max_task_count) break;
                const checked = await this.check_task(task);
                if (checked) this.run_task(checked);
            }
            if (this.running_tasks.size == 0) break;
        }
    }
    run_task(task: Task) {
        if (task.type == TaskType.Download) {
            this.running_tasks.set(
                task.id,
                download_task(task, this.client, this.db),
            );
        }
    }
}
