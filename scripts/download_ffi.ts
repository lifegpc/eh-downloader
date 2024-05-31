import { dirname } from "@std/path";
import { sure_dir } from "../utils.ts";

const map = JSON.parse(await Deno.readTextFile("./import_map.json")).imports;
const re = /x\/sqlite3@([0-9\.]+)/;
const sqlite3_version = map["sqlite3/"].match(re)[1];

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

await fetch_file(
    `https://github.com/denodrivers/sqlite3/releases/download/${sqlite3_version}/libsqlite3.so`,
    `./lib/libsqlite3.so`,
);
Deno.exit(0);
