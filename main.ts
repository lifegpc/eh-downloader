import { parse } from "std/flags/mod.ts";
import { load_settings } from "./config.ts";
import { check_file_permissions } from "./permissons.ts";
import { AlreadyClosedError, TaskManager } from "./task_manager.ts";
import { ParsedUrl, parseUrl, UrlType } from "./url.ts";
import { sure_dir } from "./utils.ts";
import { EhDb } from "./db.ts";
import { load_eht_file, update_database_tag } from "./eh_translation.ts";
import { get_abort_signal } from "./signal_handler.ts";

function show_help() {
    console.log("Usage: main.ts [options]");
    console.log("Options:");
    console.log("  -h, --help           Show this help");
    console.log("  -c, --config <PATH>  Specify config file path.");
    console.log("  -a, --add-only       Just add task to task list.");
}

enum CMD {
    Unknown,
    Download,
    Run,
    Optimize,
    UpdateTagTranslation,
}

const args = parse(Deno.args, {
    alias: { config: ["c"], help: ["h"], add_only: ["a", "add-only"] },
    boolean: ["help", "add_only"],
    string: ["config"],
    default: { config: "./config.json" },
    negatable: ["add_only"],
});

if (!args._.length || args.help) {
    show_help();
    Deno.exit(0);
}
const rcmd = args._[0];
let cmd = CMD.Unknown;
if (rcmd == "d" || rcmd == "download") cmd = CMD.Download;
if (rcmd == "r" || rcmd == "run") cmd = CMD.Run;
if (rcmd == "optimize") cmd = CMD.Optimize;
if (rcmd == "utt" || rcmd == "update_tag_translation") {
    cmd = CMD.UpdateTagTranslation;
}
if (cmd == CMD.Unknown) {
    throw Error(`Unknown command: ${rcmd}`);
}

const settings = await load_settings(args.config);
if (!check_file_permissions(settings.base)) {
    throw Error("Can not aceess download loaction.");
}
async function download() {
    const manager = new TaskManager(settings);
    try {
        const urls: ParsedUrl[] = [];
        for (const i of args._.slice(1)) {
            const r = parseUrl(i.toString());
            if (r) urls.push(r);
        }
        for (const u of urls) {
            if (u.type == UrlType.Gallery || u.type == UrlType.MPV) {
                await manager.add_download_task(u.gid, u.token);
            }
        }
        if (args.add_only) {
            return;
        }
        await manager.run();
    } finally {
        if (!manager.aborted) manager.close();
    }
}
async function run() {
    const manager = new TaskManager(settings);
    try {
        await manager.run();
    } finally {
        if (!manager.aborted) manager.close();
    }
}
function optimize() {
    const db = new EhDb(settings.db_path || settings.base);
    db.optimize();
    db.close();
}
async function update_tag_translation() {
    const db = new EhDb(settings.db_path || settings.base);
    const signal = get_abort_signal();
    try {
        const f = await load_eht_file(
            args._.length > 1 ? args._[1].toString() : undefined,
            signal,
        );
        update_database_tag(db, f);
    } catch (e) {
        if (!signal.aborted) throw e;
    } finally {
        db.close();
    }
}
async function main() {
    await sure_dir(settings.base);
    if (cmd == CMD.Download) {
        await download();
    } else if (cmd == CMD.Run) {
        await run();
    } else if (cmd == CMD.Optimize) {
        optimize();
    } else if (cmd == CMD.UpdateTagTranslation) {
        await update_tag_translation();
    }
}

main().catch((e) => {
    if (!(e instanceof AlreadyClosedError)) throw e;
});
