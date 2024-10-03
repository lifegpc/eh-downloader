import { load_eht_file } from "../eh_translation.ts";
import { Task, TaskType, TaskUpdateTagTranslationProgress } from "../task.ts";
import { TaskManager } from "../task_manager.ts";
import { asyncForEach, isDocker } from "../utils.ts";

export type UpdateTagTranslationConfig = {
    file?: string;
};

export const DEFAULT_UTT_CONFIG: UpdateTagTranslationConfig = {};

const PROGRESS_UPDATE_INTERVAL = 200;

export async function update_tag_translation(
    task: Task,
    manager: TaskManager,
    uttcfg: UpdateTagTranslationConfig,
) {
    const progress: TaskUpdateTagTranslationProgress = {
        added_tag: 0,
        total_tag: 0,
    };
    let last_send_progress = 0;
    const sendEvent = () => {
        const now = Date.now();
        if (now < last_send_progress + PROGRESS_UPDATE_INTERVAL) return;
        manager.dispatchTaskProgressEvent(
            TaskType.UpdateTagTranslation,
            task.id,
            progress,
        );
        last_send_progress = now;
    };
    const f = await load_eht_file(uttcfg.file, manager.aborts);
    for (const d of f.data) {
        progress.total_tag += d.count;
    }
    sendEvent();
    const file = isDocker() ? "/tmp/utt.lock" : "./utt.lock";
    await Deno.writeTextFile(file, "", { create: true, signal: manager.aborts });
    for (const d of f.data) {
        await asyncForEach(Object.getOwnPropertyNames(d.data), async (name) => {
            const tag = `${d.namespace}:${name}`;
            const t = d.data[name];
            manager.db.update_tags(tag, t.name, t.intro);
            progress.added_tag += 1;
            sendEvent();
            await Deno.readTextFile(file, { signal: manager.aborts });
        });
    }
    return task;
}
