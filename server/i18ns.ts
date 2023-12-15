import { exists } from "std/fs/exists.ts";
import { parse } from "std/jsonc/mod.ts";
import { join } from "std/path/mod.ts";
import type { I18NMap } from "./i18n.ts";
import { pick } from "accept-language-parser/";
import { get_host } from "./utils.ts";

const whole_maps = new Map<string, I18NMap>();
const LANGUAGES = ["zh-cn"];
type MODULE = "common" | "settings" | "task" | "upload" | "user";
const MODULES: MODULE[] = ["common", "settings", "task", "upload", "user"];

export async function load_translation(signal?: AbortSignal) {
    let base = import.meta.resolve("../translation").slice(7);
    if (Deno.build.os === "windows") {
        base = base.slice(1);
    }
    const enmap: I18NMap = {};
    for (const m of MODULES) {
        const t = await Deno.readTextFile(join(base, "en", m + ".jsonc"), {
            signal,
        });
        const v = <I18NMap> <unknown> parse(t);
        enmap[m] = v;
    }
    whole_maps.set("en", enmap);
    for (const l of LANGUAGES) {
        const map: I18NMap = {};
        for (const m of MODULES) {
            const p = join(base, l, m + ".jsonc");
            if (await exists(p)) {
                const t = await Deno.readTextFile(join(base, l, m + ".jsonc"), {
                    signal,
                });
                const v = <I18NMap> <unknown> Object.assign(
                    structuredClone(enmap[m]),
                    parse(t),
                );
                map[m] = v;
            } else map[m] = enmap[m];
        }
        whole_maps.set(l, map);
    }
}

export function get_i18nmap(lang: string, ...modules: MODULE[]) {
    const m = whole_maps.get(lang);
    if (!m) throw Error(`Language ${lang} is not supported.`);
    if (!modules.length) return m;
    const r: I18NMap = {};
    for (const n of modules) {
        r[n] = m[n];
    }
    return r;
}

export function i18n_handle_request(req: Request) {
    const u = new URL(req.url);
    const lang = u.searchParams.get("lang");
    if (lang && (lang === "en" || LANGUAGES.includes(lang))) {
        return lang;
    } else {
        const a = req.headers.get("Accept-Language");
        const l = (a
            ? pick(LANGUAGES, a) || pick(LANGUAGES, a, { loose: true })
            : null) || "en";
        const params = new URLSearchParams();
        params.append("lang", l);
        for (const p of u.searchParams.entries()) {
            if (p[0] !== "lang") {
                params.append(p[0], p[1]);
            }
        }
        return Response.redirect(`${get_host(req)}${u.pathname}?${params}`);
    }
}
