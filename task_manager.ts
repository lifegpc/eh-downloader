import { Client } from "./client.ts";
import { Config } from "./config.ts";
import { EhDb } from "./db.ts";
import { check_running } from "./pid_check.ts";
import { add_exit_handler } from "./signal_handler.ts";
import { Task, TaskProgress, TaskProgressBasicType, TaskType } from "./task.ts";
import { download_task } from "./tasks/download.ts";
import {
    DEFAULT_EXPORT_ZIP_CONFIG,
    export_zip,
    ExportZipConfig,
} from "./tasks/export_zip.ts";
import {
    DiscriminatedUnion,
    promiseState,
    PromiseStatus,
    sleep,
} from "./utils.ts";

export class AlreadyClosedError extends Error {
}

type EventMap = {
    new_task: Task;
    task_started: Task;
    task_finished: Task;
    task_progress: TaskProgress;
};

type Detail<T extends Record<PropertyKey, unknown>> = {
    [P in keyof T]: { detail: T[P] };
};

export type TaskEventData = DiscriminatedUnion<"type", Detail<EventMap>>;

type RunningTask = {
    task: Promise<Task>;
    base: Task;
};

export class TaskManager extends EventTarget {
    #closed = false;
    cfg;
    client;
    db;
    running_tasks: Map<number, RunningTask>;
    max_task_count;
    #abort;
    #force_abort;
    constructor(cfg: Config) {
        super();
        this.cfg = cfg;
        this.#abort = new AbortController();
        this.#force_abort = new AbortController();
        this.client = new Client(cfg, this.#force_abort.signal);
        this.db = new EhDb(cfg.db_path || cfg.base);
        this.running_tasks = new Map();
        this.max_task_count = cfg.max_task_count;
        add_exit_handler(this);
    }
    async #add_task(task: Task) {
        const r = await this.db.add_task(task);
        this.dispatchEvent("new_task", r);
        return r;
    }
    #check_closed() {
        if (this.#closed) throw new AlreadyClosedError();
    }
    abort(reason?: unknown) {
        this.#abort.abort(reason);
    }
    // @ts-ignore Checked type
    addEventListener<T extends keyof EventMap>(
        type: T,
        callback: (e: CustomEvent<EventMap[T]>) => void | Promise<void>,
        options?: boolean | AddEventListenerOptions,
    ): void {
        super.addEventListener(type, <EventListener> callback, options);
    }
    get aborted() {
        return this.#abort.signal.aborted;
    }
    get aborts() {
        return this.#abort.signal;
    }
    async add_download_task(gid: number, token: string) {
        this.#check_closed();
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
            type: TaskType.Download,
            details: null,
        };
        return await this.#add_task(task);
    }
    async add_export_zip_task(gid: number, output?: string) {
        const cfg: ExportZipConfig = { output };
        const task: Task = {
            gid,
            token: "",
            id: 0,
            pid: Deno.pid,
            type: TaskType.ExportZip,
            details: JSON.stringify(cfg),
        };
        return await this.#add_task(task);
    }
    async check_task(task: Task) {
        this.#check_closed();
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
        this.#check_closed();
        if (task.pid == Deno.pid) {
            return this.running_tasks.has(task.id);
        } else {
            const r = await check_running(task.pid);
            return r === true;
        }
    }
    async check_running_tasks() {
        this.#check_closed();
        const removed_task: number[] = [];
        for (const [id, task] of this.running_tasks) {
            const status = await promiseState(task.task);
            if (status.status == PromiseStatus.Fulfilled && status.value) {
                removed_task.push(id);
                await this.db.delete_task(status.value);
                this.dispatchEvent("task_finished", status.value);
            } else if (status.status == PromiseStatus.Rejected) {
                if (status.reason && !this.aborted) console.log(status.reason);
                removed_task.push(id);
            }
        }
        for (const id of removed_task) {
            this.running_tasks.delete(id);
        }
    }
    close() {
        if (this.#closed) {
            console.trace("Manager closed multiple times.");
            return;
        }
        this.#closed = true;
        this.db.close();
    }
    // @ts-ignore Checked type
    dispatchEvent<T extends keyof EventMap>(type: T, detail: EventMap[T]) {
        return super.dispatchEvent(new CustomEvent(type, { detail }));
    }
    dispatchTaskProgressEvent<T extends TaskType>(
        type: T,
        task_id: number,
        detail: TaskProgressBasicType[T],
    ) {
        return this.dispatchEvent("task_progress", { type, task_id, detail });
    }
    force_abort(reason?: unknown) {
        this.#force_abort.abort(reason);
    }
    get force_aborted() {
        return this.#force_abort.signal.aborted;
    }
    get force_aborts() {
        return this.#force_abort.signal;
    }
    get_running_task() {
        return Array.from(this.running_tasks.keys());
    }
    get_task_list() {
        return this.db.get_tasks();
    }
    // @ts-ignore Checked type
    removeEventListener<T extends keyof EventMap>(
        type: T,
        callback: (e: CustomEvent<EventMap[T]>) => void | Promise<void>,
        options?: boolean | EventListenerOptions,
    ): void {
        super.removeEventListener(
            type,
            <EventListener> callback,
            options,
        );
    }
    async run(forever = false) {
        if (this.aborted || this.force_aborted) throw new AlreadyClosedError();
        this.#check_closed();
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
            if (this.running_tasks.size == 0) {
                if (!forever) break;
                await sleep(1000);
            }
        }
    }
    run_task(task: Task) {
        this.#check_closed();
        this.dispatchEvent("task_started", task);
        if (task.type == TaskType.Download) {
            this.running_tasks.set(
                task.id,
                {
                    task: download_task(
                        task,
                        this.client,
                        this.db,
                        this.cfg,
                        this.#abort.signal,
                        this.#force_abort.signal,
                        this,
                    ),
                    base: task,
                },
            );
        } else if (task.type == TaskType.ExportZip) {
            const cfg: ExportZipConfig = task.details
                ? JSON.parse(task.details)
                : DEFAULT_EXPORT_ZIP_CONFIG;
            this.running_tasks.set(
                task.id,
                {
                    task: export_zip(
                        task,
                        this.db,
                        this.cfg,
                        this.#abort.signal,
                        cfg,
                        this,
                    ),
                    base: task,
                },
            );
        }
    }
    async waiting_unfinished_task() {
        while (1) {
            await this.check_running_tasks();
            if (this.running_tasks.size == 0) break;
            await sleep(10);
        }
    }
}
