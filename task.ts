export enum TaskType {
    Download,
    ExportZip,
    UpdateMeiliSearchData,
}

export type Task<T extends TaskType = TaskType> = {
    id: number;
    type: T;
    gid: number;
    token: string;
    pid: number;
    details: string | null;
};

export type TaskDownloadProgess = {
    downloaded_page: number;
    failed_page: number;
    total_page: number;
};

export type TaskExportZipProgress = {
    added_page: number;
    total_page: number;
};

export type TaskUpdateMeiliSearchDataProgress = {
    total_gallery: number;
    updated_gallery: number;
};

export type TaskProgressBasicType = {
    [TaskType.Download]: TaskDownloadProgess;
    [TaskType.ExportZip]: TaskExportZipProgress;
    [TaskType.UpdateMeiliSearchData]: TaskUpdateMeiliSearchDataProgress;
};

export type TaskProgress<T extends TaskType = TaskType> = {
    type: T;
    task_id: number;
    detail: TaskProgressBasicType[T];
};

export enum TaskStatus {
    Wait,
    Running,
    Finished,
}

export type TaskDetail<T extends TaskType = TaskType> = {
    base: Task<T>;
    progress?: TaskProgressBasicType[T];
    status: TaskStatus;
};
