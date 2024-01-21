import { exists } from "std/fs/exists.ts";

export const API_PERMISSION: Deno.PermissionOptions = {
    read: ["./config.json"],
    net: [
        "e-hentai.org",
        "exhentai.org",
        "api.e-hentai.org",
        "api.exhentai.org",
    ],
};

export const DB_PERMISSION: Deno.PermissionOptions = {
    env: ["DB_USE_FFI"],
    read: ["./test"],
    write: ["./test"],
};

export async function remove_if_exists(f: string) {
    if (await exists(f)) await Deno.remove(f, { "recursive": true });
}
