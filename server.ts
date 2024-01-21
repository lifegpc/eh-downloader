import { RenderFunction, start } from "$fresh/server.ts";
import { load_settings } from "./config.ts";
import manifest from "./fresh.gen.ts";
import { AlreadyClosedError, TaskManager } from "./task_manager.ts";
import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "./twind.config.ts";
import { load_translation } from "./server/i18ns.ts";

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
    task_manager = new TaskManager(cfg);
    await task_manager.init();
    task_manager.run(true).catch((e) => {
        if (!(e instanceof AlreadyClosedError)) throw e;
    });
    await load_translation(task_manager.aborts);
    return start(manifest, {
        signal: task_manager.aborts,
        plugins: [twindPlugin(twindConfig)],
        render: renderFn,
        port: cfg.port,
        hostname: cfg.hostname,
    });
}
