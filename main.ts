import { parse } from "std/flags/mod.ts";
import { load_settings } from "./config.ts";
import { check_file_permissions } from "./permissons.ts";
import { AlreadyClosedError, TaskManager } from "./task_manager.ts";
import { ParsedUrl, parseUrl, UrlType } from "./url.ts";
import { sure_dir, try_remove_sync } from "./utils.ts";
import { EhDb } from "./db.ts";
import { load_eht_file, update_database_tag } from "./eh_translation.ts";
import { get_abort_signal } from "./signal_handler.ts";

function show_help() {
    console.log("Usage: main.ts [options] Command");
    console.log("Commonds:");
    console.log("  d/download <URL>     Download a gallery");
    console.log("  r/run                Run tasks in database");
    console.log("  optimize             Optimize the database");
    console.log("  utt/update_tag_translation");
    console.log("  ez/export_zip <GID>  Export a gallery as zip");
    console.log(
        "  umsd/update_meili_search_data    Sync all gallery metadata to meiliserach server.",
    );
    console.log("Options:");
    console.log("  -h, --help           Show this help");
    console.log("  -c, --config <PATH>  Specify config file path.");
    console.log("  -a, --add-only       Just add task to task list.");
    console.log("  -b, --better-optimize Use better way to optimize.");
}

enum CMD {
    Unknown,
    Download,
    Run,
    Optimize,
    UpdateTagTranslation,
    ExportZip,
    UpdateMeiliSearchData,
}

const args = parse(Deno.args, {
    alias: {
        config: ["c"],
        help: ["h"],
        add_only: ["a", "add-only"],
        better_optimize: ["b", "better-optimize"],
    },
    boolean: ["help", "add_only", "better_optimize"],
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
if (rcmd == "ez" || rcmd == "export_zip") cmd = CMD.ExportZip;
if (rcmd == "umsd" || rcmd == "update_meili_search_data") {
    cmd = CMD.UpdateMeiliSearchData;
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
    if (args.better_optimize) db.better_optimize();
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
        await update_database_tag(db, f, signal);
    } catch (e) {
        if (!signal.aborted) throw e;
    } finally {
        try_remove_sync("utt.lock");
        db.close();
    }
}
async function export_zip() {
    const manager = new TaskManager(settings);
    try {
        for (const gid of args._.slice(1)) {
            if (typeof gid === "number") {
                await manager.add_export_zip_task(gid);
            }
        }
        await manager.run();
    } finally {
        if (!manager.aborted) manager.close();
    }
}
async function update_meili_search_data() {
    const manager = new TaskManager(settings);
    try {
        await manager.add_update_meili_search_data_task();
        await manager.run();
    } finally {
        if (!manager.aborted) manager.close();
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
    } else if (cmd == CMD.ExportZip) {
        await export_zip();
    } else if (cmd == CMD.UpdateMeiliSearchData) {
        await update_meili_search_data();
    }
}

main().catch((e) => {
    if (!(e instanceof AlreadyClosedError)) throw e;
});
