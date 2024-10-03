import type { Task } from "../task.ts";
import type { TaskEventData } from "../task_manager.ts";
import type { DownloadConfig } from "../tasks/download.ts";
import type { ExportZipConfig } from "../tasks/export_zip.ts";
import type { UpdateTagTranslationConfig } from "../tasks/update_tag_translation.ts";
import type { DiscriminatedUnion } from "../utils.ts";

export type TaskServerSocketData =
    | TaskEventData
    | { type: "close" }
    | {
        type: "tasks";
        tasks: Task[];
        running: (number | bigint)[];
    }
    | { type: "ping" }
    | { type: "pong" };

type EventMap = {
    new_download_task: {
        gid: number | bigint;
        token: string;
        cfg?: DownloadConfig;
    };
    new_export_zip_task: { gid: number | bigint; cfg?: ExportZipConfig };
    new_update_tag_translation_task: { cfg?: UpdateTagTranslationConfig };
};

export type TaskClientSocketData =
    | DiscriminatedUnion<"type", EventMap>
    | {
        type: "close";
    }
    | { type: "task_list" }
    | { type: "ping" }
    | { type: "pong" };
