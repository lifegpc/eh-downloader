export enum TaskType {
    Download,
}

export type Task = {
    id: number;
    type: TaskType;
    gid: number;
    token: string;
    pn: number;
    pid: number;
};
