export enum TaskType {
    Download,
    ExportZip,
    UpdateMeiliSearchData,
    FixGalleryPage,
    Import,
    UpdateTagTranslation,
}

export type Task<T extends TaskType = TaskType> = {
    id: number | bigint;
    type: T;
    gid: number | bigint;
    token: string;
    pid: number | bigint;
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
    speed: number;
    last_updated: number;
};

export type TaskDownloadProgess = {
    downloaded_page: number;
    failed_page: number;
    total_page: number;
    started: number;
    downloaded_bytes: number;
    details: TaskDownloadSingleProgress[];
};

export type TaskExportZipProgress = {
    added_page: number;
    total_page: number;
};

export type TaskUpdateMeiliSearchDataProgress = {
    total_gallery: number | bigint;
    updated_gallery: number;
};

export type TaskFixGalleryPageProgress = {
    total_gallery: number | bigint;
    checked_gallery: number;
};

export type TaskImportProgress = {
    imported_page: number;
    failed_page: number;
    total_page: number;
};

export type TaskUpdateTagTranslationProgress = {
    added_tag: number;
    total_tag: number;
};

export type TaskProgressBasicType = {
    [TaskType.Download]: TaskDownloadProgess;
    [TaskType.ExportZip]: TaskExportZipProgress;
    [TaskType.UpdateMeiliSearchData]: TaskUpdateMeiliSearchDataProgress;
    [TaskType.FixGalleryPage]: TaskFixGalleryPageProgress;
    [TaskType.Import]: TaskImportProgress;
    [TaskType.UpdateTagTranslation]: TaskUpdateTagTranslationProgress;
};

export type TaskProgress<T extends TaskType = TaskType> = {
    type: T;
    task_id: number | bigint;
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
