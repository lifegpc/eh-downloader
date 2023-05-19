import { Client } from "../client.ts";
import { EhDb } from "../db.ts";
import { Task } from "../task.ts";

export async function download_task(task: Task, client: Client, db: EhDb) {
    console.log("Started to download gallery", task.gid);
    return task;
}
