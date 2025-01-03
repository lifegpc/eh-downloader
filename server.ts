import { RenderFunction, start } from "$fresh/server.ts";
import { load_settings } from "./config.ts";
import manifest from "./fresh.gen.ts";
import { AlreadyClosedError, TaskManager } from "./task_manager.ts";
import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "./twind.config.ts";
import { load_translation } from "./server/i18ns.ts";
import { base_logger } from "./utils/logger.ts";
import { ExitTarget } from "./signal_handler.ts";

let task_manager: TaskManager | undefined = undefined;
let cfg_path: string | undefined = undefined;

export function get_task_manager() {
    if (!task_manager) throw Error("task manager undefined.");
    return task_manager;
}

export function get_cfg_path() {
    if (!cfg_path) throw Error("cfg_path undefined.");
    return cfg_path;
}

const renderFn: RenderFunction = (ctx, render) => {
    const u = new URL(ctx.url);
    const lang = u.searchParams.get("lang");
    if (lang) ctx.lang = lang;
    render();
};

export async function startServer(path: string) {
    cfg_path = path;
    const cfg = await load_settings(path);
    await base_logger.init(cfg);
    task_manager = new TaskManager(cfg);
    await task_manager.init();
    task_manager.run(true).catch((e) => {
        if (!(e instanceof AlreadyClosedError)) throw e;
    });
    await load_translation(task_manager.aborts);
    const tasks: number[] = [];
    tasks.push(setInterval(() => {
        task_manager?.db.remove_expired_token();
    }, 86_400_000));
    tasks.push(setInterval(() => {
        if (!task_manager) return;
        task_manager.db.remove_expired_ehmeta(
            task_manager.cfg.eh_metadata_cache_time,
        );
    }, 3600_000));
    ExitTarget.addEventListener("close", () => {
        for (const t of tasks) clearInterval(t);
    });
    return start(manifest, {
        signal: task_manager.aborts,
        plugins: [twindPlugin(twindConfig)],
        render: renderFn,
        port: cfg.port,
        hostname: cfg.hostname,
    });
}
