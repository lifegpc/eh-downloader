import { join } from "std/path/mod.ts";
import { Uint8ArrayReader, ZipWriter } from "zipjs/index.js";
import type { EhDb } from "../db.ts";
import {
    addZero,
    asyncForEach,
    configureZipJs,
    filterFilename,
    limitFilename,
} from "../utils.ts";
import { Config } from "../config.ts";
import { Task, TaskExportZipProgress, TaskType } from "../task.ts";
import { TaskManager } from "../task_manager.ts";

export type ExportZipConfig = {
    output?: string;
    jpn_title?: boolean;
    max_length?: number;
    export_ad?: boolean;
};

export const DEFAULT_EXPORT_ZIP_CONFIG: ExportZipConfig = {};

export async function export_zip(
    task: Task,
    db: EhDb,
    cfg: Config,
    signal: AbortSignal,
    ecfg: ExportZipConfig,
    manager: TaskManager,
) {
    const gid = task.gid;
    const g = db.get_gmeta_by_gid(gid);
    if (!g) throw Error("Gallery not found in database.");
    const jpn_title = ecfg.jpn_title !== undefined
        ? ecfg.jpn_title
        : cfg.export_zip_jpn_title;
    const progress: TaskExportZipProgress = {
        total_page: g.filecount,
        added_page: 0,
    };
    const sendEvent = () => {
        manager.dispatchTaskProgressEvent(TaskType.ExportZip, task.id, {
            added_page: progress.added_page,
            total_page: progress.total_page,
        });
    };
    sendEvent();
    const title = (jpn_title && g.title_jpn) ? g.title_jpn : g.title;
    const output = !ecfg.output
        ? join(cfg.base, filterFilename(title + ".zip"))
        : ecfg.output;
    const maxLength = ecfg.max_length || 0;
    const f = await Deno.open(output, {
        create: true,
        write: true,
        truncate: true,
    });
    try {
        configureZipJs();
        const z = new ZipWriter(f.writable, {
            signal,
            level: 0,
        });
        const l = g.filecount.toString().length;
        await asyncForEach(
            db.get_pmeta(gid).sort((a, b) => a.index - b.index),
            async (p) => {
                const f = db.get_files(p.token);
                const t = db.get_filemeta(p.token);
                if (t && t.is_ad && !ecfg.export_ad) {
                    progress.total_page -= 1;
                    sendEvent();
                    return;
                }
                if (f.length) {
                    const r = await Deno.readFile(f[0].path, { signal });
                    await z.add(
                        limitFilename(
                            `${addZero(p.index, l)}_${p.name}`,
                            maxLength,
                        ),
                        new Uint8ArrayReader(r),
                        { signal },
                    );
                }
                progress.added_page += 1;
                sendEvent();
            },
        );
        await z.close();
    } finally {
        try {
            f.close();
        } catch (_) {
            null;
        }
    }
    return task;
}
