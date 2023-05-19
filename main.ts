import { parse } from "https://deno.land/std@0.188.0/flags/mod.ts";
import { load_settings } from "./config.ts";
import { check_file_permissions } from "./permissons.ts";
import { TaskManager } from "./task_manager.ts";
import { ParsedUrl, parseUrl, UrlType } from "./url.ts";
import { sure_dir } from "./utils.ts";

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
if (cmd == CMD.Unknown) {
    throw Error(`Unknown command: ${rcmd}`);
}

const settings = await load_settings(args.config);
if (!check_file_permissions(settings.base)) {
    throw Error("Can not aceess download loaction.");
}
async function download() {
    const manager = new TaskManager(settings);
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
    if (args.add_only) return;
    await manager.run();
}
async function run() {
    const manager = new TaskManager(settings);
    await manager.run();
}
async function main() {
    await sure_dir(settings.base);
    if (cmd == CMD.Download) {
        download();
    } else if (cmd == CMD.Run) {
        run();
    }
}

main();
