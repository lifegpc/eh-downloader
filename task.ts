export enum TaskType {
    Download,
    ExportZip,
    UpdateMeiliSearchData,
    FixGalleryPage,
}

export type Task<T extends TaskType = TaskType> = {
    id: number;
    type: T;
    gid: number;
    token: string;
    pid: number;
    details: string | null;
};

export type TaskDownloadSingleProgress = {
    index: number;
    token: string;
    name: string;
    width: number;
    height: number;
    is_original: boolean;
    total: number;
    started: number;
    downloaded: number;
};

export type TaskDownloadProgess = {
    downloaded_page: number;
    failed_page: number;
    total_page: number;
    details: TaskDownloadSingleProgress[];
};

export type TaskExportZipProgress = {
    added_page: number;
    total_page: number;
};

export type TaskUpdateMeiliSearchDataProgress = {
    total_gallery: number;
    updated_gallery: number;
};

export type TaskFixGalleryPageProgress = {
    total_gallery: number;
    checked_gallery: number;
};

export type TaskProgressBasicType = {
    [TaskType.Download]: TaskDownloadProgess;
    [TaskType.ExportZip]: TaskExportZipProgress;
    [TaskType.UpdateMeiliSearchData]: TaskUpdateMeiliSearchDataProgress;
    [TaskType.FixGalleryPage]: TaskFixGalleryPageProgress;
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
    Failed,
}

export type TaskDetail<T extends TaskType = TaskType> = {
    base: Task<T>;
    progress?: TaskProgressBasicType[T];
    status: TaskStatus;
    error?: string;
    fataled?: boolean;
};
