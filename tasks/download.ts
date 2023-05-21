import { Client } from "../client.ts";
import { Config } from "../config.ts";
import { EhDb } from "../db.ts";
import { Task } from "../task.ts";

export async function download_task(
    task: Task,
    client: Client,
    db: EhDb,
    cfg: Config,
) {
    console.log("Started to download gallery", task.gid);
    const gdatas = await client.fetchGalleryMetadataByAPI([
        task.gid,
        task.token,
    ]);
    const gdata = gdatas.map.get(task.gid);
    if (gdata === undefined) throw Error("Gallery metadata not included.");
    if (typeof gdata === "string") throw Error(gdata);
    const gmeta = gdatas.convert(gdata);
    db.add_gmeta(gmeta);
    await db.add_gtag(task.gid, new Set(gdata.tags));
    if (cfg.mpv) {
        const mpv = await client.fetchMPVPage(task.gid, task.token);
    }
    return task;
}
