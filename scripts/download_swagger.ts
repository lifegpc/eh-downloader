import { join } from "@std/path";
import { configure, HttpReader, ZipReader } from "zipjs/index.js";
import { sure_dir } from "../utils.ts";

async function get_latest_version() {
    const re = await fetch(
        "https://api.github.com/repos/swagger-api/swagger-ui/releases/latest",
    );
    if (!re.ok) {
        throw new Error(
            `Failed to fetch latest version: ${re.status} ${re.statusText}`,
        );
    }
    const json = await re.json();
    return json.tag_name;
}

async function get_download_url() {
    const version = await get_latest_version();
    return `https://github.com/swagger-api/swagger-ui/archive/refs/tags/${version}.zip`;
}

const DIST = /swagger-ui-[1-9\.]+\/dist/;

async function unzip(url: string) {
    const zip_reader = new ZipReader(new HttpReader(url));
    const entries = await zip_reader.getEntries();
    let swagger_base = import.meta.resolve("../static/swagger").slice(7);
    if (Deno.build.os === "windows") {
        swagger_base = swagger_base.slice(1);
    }
    await sure_dir(swagger_base);
    for (const entry of entries) {
        const m = entry.filename.match(DIST);
        if (!m) {
            continue;
        }
        const filename = entry.filename.replace(DIST, "");
        if (filename.endsWith("/")) {
            const path = join(swagger_base, filename);
            await sure_dir(path);
            continue;
        }
        if (!entry.getData) {
            continue;
        }
        const path = join(swagger_base, filename);
        console.log("Extracting", entry.filename, "to", path);
        const file = await Deno.open(path, { write: true, create: true });
        try {
            await entry.getData(file.writable);
        } finally {
            try {
                file.close();
            } catch (_) {
                null;
            }
        }
    }
}

configure({ useWebWorkers: false });
const download_url = await get_download_url();
await unzip(download_url);
