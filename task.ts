export enum TaskType {
    Download,
    ExportZip,
}

export type Task = {
    id: number;
    type: TaskType;
    gid: number;
    token: string;
    pn: number;
    pid: number;
    details: string | null;
};
