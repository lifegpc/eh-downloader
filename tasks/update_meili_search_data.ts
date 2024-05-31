import { Task, TaskType, TaskUpdateMeiliSearchDataProgress } from "../task.ts";
import { TaskManager } from "../task_manager.ts";

export async function update_meili_search_data(
    task: Task,
    manager: TaskManager,
) {
    if (!manager.meilisearch) throw Error("MeiliServer not found.");
    await manager.meilisearch.removeAllGallery();
    const progress: TaskUpdateMeiliSearchDataProgress = {
        total_gallery: 0,
        updated_gallery: 0,
    };
    const sendEvent = () => {
        manager.dispatchTaskProgressEvent(
            TaskType.UpdateMeiliSearchData,
            task.id,
            progress,
        );
    };
    if (task.gid != 0) {
        progress.total_gallery = 1;
        sendEvent();
        await manager.meilisearch.updateGallery(task.gid);
        progress.updated_gallery = 1;
        sendEvent();
    } else {
        progress.total_gallery = manager.db.get_gallery_count();
        sendEvent();
        let i = manager.db.get_gids();
        let offset = 0;
        while (i.length) {
            await manager.meilisearch.updateGallery(...i);
            offset += i.length;
            progress.updated_gallery = offset;
            sendEvent();
            i = manager.db.get_gids(offset);
        }
    }
    return task;
}
