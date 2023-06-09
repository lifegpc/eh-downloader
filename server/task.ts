import { Task } from "../task.ts";
import { TaskEventData } from "../task_manager.ts";
import { DownloadConfig } from "../tasks/download.ts";
import { ExportZipConfig } from "../tasks/export_zip.ts";
import { DiscriminatedUnion } from "../utils.ts";

export type TaskServerSocketData = TaskEventData | { type: "close" } | {
    type: "tasks";
    tasks: Task[];
    running: number[];
};

type EventMap = {
    new_download_task: { gid: number; token: string; cfg?: DownloadConfig };
    new_export_zip_task: { gid: number; cfg?: ExportZipConfig };
};

export type TaskClientSocketData = DiscriminatedUnion<"type", EventMap> | {
    type: "close";
} | { type: "task_list" };
