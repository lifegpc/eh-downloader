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

export type TaskProgressType = {
    [TaskType.Download]: TaskDownloadProgess;
    [TaskType.ExportZip]: TaskExportZipProgress;
};

export type TaskProgress = DiscriminatedUnion<"type", TaskProgressType>;
