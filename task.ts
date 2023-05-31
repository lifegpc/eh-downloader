import { DiscriminatedUnion } from "./utils.ts";

export enum TaskType {
    Download,
    ExportZip,
}

export type Task = {
    id: number;
    type: TaskType;
    gid: number;
    token: string;
    pid: number;
    details: string | null;
};

export type TaskDownloadProgess = {
    downloaded_page: number;
    total_page: number;
};

export type TaskExportZipProgress = {
    added_page: number;
    total_page: number;
};

type TaskId<T extends Record<PropertyKey, unknown>> = {
    [P in keyof T]: ({
        task_id: number;
    } & T[P]) extends infer U ? { [Q in keyof U]: U[Q] } : never;
};

export type TaskProgressType = TaskId<{
    [TaskType.Download]: TaskDownloadProgess;
    [TaskType.ExportZip]: TaskExportZipProgress;
}>;

export type TaskProgress = DiscriminatedUnion<"type", TaskProgressType>;
