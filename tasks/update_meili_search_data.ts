import { Task } from "../task.ts";
import { TaskManager } from "../task_manager.ts";

export async function update_meili_search_data(
    task: Task,
    manager: TaskManager,
) {
    if (!manager.meilisearch) throw Error("MeiliServer not found.");
    if (task.gid !== 0) {
        await manager.meilisearch.updateGallery(task.gid);
    } else {
        let i = manager.db.get_gids();
        let offset = 0;
        while (i.length) {
            await manager.meilisearch.updateGallery(...i);
            offset += i.length;
            i = manager.db.get_gids(offset);
        }
    }
    return task;
}
