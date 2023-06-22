import { Task, TaskFixGalleryPageProgress, TaskType } from "../task.ts";
import { TaskManager } from "../task_manager.ts";
import { asyncForEach } from "../utils.ts";

export async function fix_gallery_page(t: Task, m: TaskManager) {
    const p: TaskFixGalleryPageProgress = {
        total_gallery: m.db.get_gallery_count(),
        checked_gallery: 0,
    };
    const sendEvent = () => {
        m.dispatchTaskProgressEvent(TaskType.FixGalleryPage, t.id, p);
    };
    sendEvent();
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
            p.checked_gallery += 1;
            sendEvent();
        });
        offset += gids.length;
        gids = m.db.get_gids(offset);
    }
    return t;
}
