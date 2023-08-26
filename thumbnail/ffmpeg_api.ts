/// <reference lib="deno.unstable" />
import { Struct } from "pwn/mod.ts";
import { ThumbnailGenMethod } from "./base.ts";

let libSuffix = "";
let libPrefix = "lib";
switch (Deno.build.os) {
    case "windows":
        libSuffix = "dll";
        libPrefix = "";
        break;
    case "darwin":
        libSuffix = "dylib";
        break;
    default:
        libSuffix = "so";
        break;
}

let libPath = import.meta.resolve(`../lib/${libPrefix}thumbnail.${libSuffix}`)
    .slice(7);
if (Deno.build.os === "windows") {
    libPath = libPath.slice(1);
}

const lib = Deno.dlopen(
    libPath,
    {
        "gen_thumbnail": {
            "parameters": ["buffer", "buffer", "i32", "i32", "i32"],
            "result": { struct: ["i32", "i32"] },
            "nonblocking": true,
        },
        "thumbnail_error": {
            "parameters": [{ struct: ["i32", "i32"] }, "buffer", "usize"],
            "result": "void",
        },
    } as const,
);
const _Result = new Struct({ e: "s32", fferr: "s32" });

function get_error(fferr: Uint8Array) {
    const u = new Uint8Array(64);
    lib.symbols.thumbnail_error(fferr, u, u.length);
    let len = u.findIndex((i) => i === 0);
    if (len === -1) len = u.length;
    return (new TextDecoder()).decode(u.slice(0, len));
}

export async function gen_thumbnail(
    src: string,
    dest: string,
    width: number,
    height: number,
    method: ThumbnailGenMethod,
) {
    const t = new TextEncoder();
    const ore = await lib.symbols.gen_thumbnail(
        t.encode(`${src}\0`),
        t.encode(`${dest}\0`),
        width,
        height,
        method,
    );
    const re = _Result.unpack(ore);
    if (re.e) return get_error(ore);
    return;
}
