import { join } from "std/path/mod.ts";
import { Uint8ArrayReader, ZipWriter } from "zipjs/index.js";
import { EhDb } from "../db.ts";
import { addZero, asyncForEach } from "../utils.ts";
import { Config } from "../config.ts";
import { Task } from "../task.ts";

export type ExportZipConfig = {
    output?: string;
};

export const DEFAULT_EXPORT_ZIP_CONFIG: ExportZipConfig = {};

export async function export_zip(
    task: Task,
    db: EhDb,
    cfg: Config,
    signal: AbortSignal,
    ecfg: ExportZipConfig,
) {
    const gid = task.gid;
    const g = db.get_gmeta_by_gid(gid);
    if (!g) throw Error("Gallery not found in database.");
    const output = ecfg.output === undefined
        ? join(cfg.base, g.title + ".zip")
        : ecfg.output;
    const f = await Deno.open(output, {
        create: true,
        write: true,
        truncate: true,
    });
    try {
        const z = new ZipWriter(f.writable, {
            signal,
            level: 0,
        });
        const l = g.filecount.toString().length;
        await asyncForEach(
            db.get_pmeta(gid).sort((a, b) => a.index - b.index),
            async (p) => {
                const f = db.get_files(gid, p.token);
                if (f.length) {
                    const r = await Deno.readFile(f[0].path, { signal });
                    await z.add(
                        `${addZero(p.index, l)}_${p.name}`,
                        new Uint8ArrayReader(r),
                        { signal },
                    );
                }
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
