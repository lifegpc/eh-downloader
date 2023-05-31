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
