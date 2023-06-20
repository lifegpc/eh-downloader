import { Task } from "../task.ts";
import { TaskManager } from "../task_manager.ts";
import { asyncForEach } from "../utils.ts";

export async function fix_gallery_page(t: Task, m: TaskManager) {
    let offset = 0;
    let gids = m.db.get_gids(offset);
    while (gids.length) {
        await asyncForEach(gids, async (gid) => {
            const gmeta = m.db.get_gmeta_by_gid(gid);
            if (!gmeta) return;
            const count = m.db.get_pmeta_count(gid);
            if (gmeta.filecount != count) {
                await m.add_download_task(gid, gmeta.token);
            }
        });
        offset += gids.length;
        gids = m.db.get_gids(offset);
    }
    return t;
}
