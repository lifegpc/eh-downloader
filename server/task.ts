import { Task } from "../task.ts";
import { TaskEventData } from "../task_manager.ts";
import { DiscriminatedUnion } from "../utils.ts";

export type TaskServerSocketData = TaskEventData | { type: "close" } | {
    type: "tasks";
    tasks: Task[];
    running: number[];
};

type EventMap = {
    new_download_task: { gid: number; token: string };
    new_export_zip_task: { gid: number; output?: string };
};

export type TaskClientSocketData = DiscriminatedUnion<"type", EventMap> | {
    type: "close";
} | { type: "task_list" };
