import { dirname, join } from "std/path/mod.ts";
import { sure_dir } from "./utils.ts";

const map = JSON.parse(await Deno.readTextFile("./import_map.json")).imports;
const LIST: string[] = [
    "preact-material-components/TopAppBar/style.css",
    "preact-material-components/List/style.css",
    "preact-material-components/Icon/style.css",
];

function get_url(i: string) {
    for (const v of Object.getOwnPropertyNames(map)) {
        if (v.endsWith("/") && i.startsWith(v)) {
            return i.replace(v, map[v]);
        }
    }
    for (const v of Object.getOwnPropertyNames(map)) {
        if (i.startsWith(v)) {
            return i.replace(v, map[v]);
        }
    }
    return i;
}

async function fetch_file(u: string | URL, p: string) {
    await sure_dir(dirname(p));
    const f = await Deno.open(p, { create: true, write: true, truncate: true });
    try {
        const r = await fetch(u);
        if (!r.body) throw Error("No body.");
        await r.body.pipeTo(f.writable);
    } finally {
        try {
            f.close();
        } catch (_) {
            null;
        }
    }
}

for (const i of LIST) {
    const u = get_url(i);
    const p = join("./static", i);
    await fetch_file(u, p);
}
