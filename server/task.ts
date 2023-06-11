import { Task } from "../task.ts";
import { TaskEventData } from "../task_manager.ts";
import { ExportZipConfig } from "../tasks/export_zip.ts";
import { DiscriminatedUnion } from "../utils.ts";

export type TaskServerSocketData = TaskEventData | { type: "close" } | {
    type: "tasks";
    tasks: Task[];
    running: number[];
};

type Gid<T extends Record<PropertyKey, unknown>> = ({ gid: number } & T) extends
    infer U ? { [Q in keyof U]: U[Q] } : never;

type EventMap = {
    new_download_task: { gid: number; token: string };
    new_export_zip_task: Gid<ExportZipConfig>;
};

export type TaskClientSocketData = DiscriminatedUnion<"type", EventMap> | {
    type: "close";
} | { type: "task_list" };
