import { exists } from "std/fs/exists.ts";

export const API_PERMISSION: Deno.PermissionOptions = {
    read: ["./config.json"],
    net: ["e-hentai.org", "exhentai.org"],
};

export async function remove_if_exists(f: string) {
    if (await exists(f)) await Deno.remove(f, { "recursive": true });
}
