import { exists, existsSync } from "@std/fs/exists";
import { extname } from "@std/path";
import { initParser } from "deno_dom/wasm-noinit";
import { configure } from "zipjs/index.js";
import { MD5 } from "lifegpc-md5";
import { SHA1 } from "@lifegpc/sha1";

export function sleep(time: number): Promise<undefined> {
    return new Promise((r) => {
        setTimeout(() => {
            r(undefined);
        }, time);
    });
}

export async function sure_dir(f = "./test") {
    if (!await exists(f)) {
        await Deno.mkdir(f, { "recursive": true });
    }
}

export function sure_dir_sync(f = "./test") {
    if (!existsSync(f)) {
        Deno.mkdirSync(f, { "recursive": true });
    }
}

export enum PromiseStatus {
    Pending,
    Fulfilled,
    Rejected,
}

export type PromiseState<T> = {
    status: PromiseStatus;
    value: Awaited<T> | undefined;
    reason: unknown;
};

export function promiseState<T>(p: Promise<T>): Promise<PromiseState<T>> {
    const pe = { status: PromiseStatus.Pending };
    return new Promise((resolve) => {
        Promise.race([p, pe]).then((v) => {
            v === pe ? resolve(pe as PromiseState<T>) : resolve(
                {
                    status: PromiseStatus.Fulfilled,
                    value: v,
                } as PromiseState<T>,
            );
        }).catch((e) => {
            resolve(
                { status: PromiseStatus.Rejected, reason: e } as PromiseState<
                    T
                >,
            );
        });
    });
}

let inited_parser = false;

export async function initDOMParser() {
    if (!inited_parser) {
        await initParser();
        inited_parser = true;
    }
}

export function parse_bool(s: string) {
    const l = s.toLowerCase();
    return l === "true" || l === "yes";
}

export function try_remove_sync(
    s: string,
    o: Deno.RemoveOptions | undefined = undefined,
) {
    try {
        Deno.removeSync(s, o);
    } catch (_) {
        return;
    }
}

const fail = Symbol();

export async function asyncFilter<T, V>(
    arr: ArrayLike<T>,
    callback: (
        this: V | undefined,
        element: T,
        index: number,
        array: ArrayLike<T>,
    ) => Promise<boolean>,
    thisArg?: V,
): Promise<T[]> {
    const t = <[T][]> (await Promise.all(
        map(
            arr,
            async (item, index, array) =>
                (await callback.apply(thisArg, [item, index, array]))
                    ? [item]
                    : fail,
        ),
    )).filter((i) => i !== fail);
    return t.map((t) => t[0]);
}

export async function asyncForEach<T, V>(
    arr: ArrayLike<T>,
    callback: (
        this: V | undefined,
        element: T,
        index: number,
        array: ArrayLike<T>,
    ) => Promise<void>,
    thisArg?: V,
) {
    for (let i = 0; i < arr.length; i++) {
        await callback.apply(thisArg, [arr[i], i, arr]);
    }
}

export function addZero(n: string | number | bigint, len: number) {
    let s = n.toString();
    while (s.length < len) s = "0" + s;
    return s;
}

export function filterFilename(p: string, maxLength = 256) {
    // strip control chars
    p = p.replace(/\p{C}/gu, "");
    // normalize newline
    p = p.replace(/[\n\r]/g, "");
    p = p.replace(/\p{Zl}/gu, "");
    p = p.replace(/\p{Zp}/gu, "");
    // normalize space
    p = p.replace(/\p{Zs}/gu, " ");
    p = p.replace(/[\\/]/g, "_");
    if (Deno.build.os == "windows") {
        p = p.replace(/[:\*\?\"<>\|]/g, "_");
    } else if (Deno.build.os == "linux") {
        p = p.replace(/[!\$\"]/g, "_");
    }
    return limitFilename(p, maxLength);
}

export function limitFilename(p: string, maxLength: number) {
    if (maxLength > 0 && p.length > maxLength) {
        const ext = extname(p);
        if (maxLength < ext.length) return ext;
        return p.slice(0, maxLength - ext.length) + ext;
    }
    return p;
}

export type DiscriminatedUnion<
    K extends PropertyKey,
    T extends Record<PropertyKey, unknown>,
> = {
    [P in keyof T]: ({ [Q in K]: P } & T[P]) extends infer U
        ? { [Q in keyof U]: U[Q] }
        : never;
}[keyof T];

let zipjs_configured = false;

export function configureZipJs() {
    if (zipjs_configured) return;
    configure({ useWebWorkers: false });
    zipjs_configured = true;
}

export function add_suffix_to_path(path: string, suffix?: string) {
    if (suffix === undefined) {
        suffix = Math.round(Math.random() * 100000).toString();
    }
    const ext = extname(path);
    if (ext) {
        return `${path.slice(0, path.length - ext.length)}-${suffix}${ext}`;
    } else {
        return `${path}-${suffix}`;
    }
}

export async function calFileMd5(p: string | URL) {
    const h = new MD5();
    const f = await Deno.open(p);
    try {
        const buf = new Uint8Array(65536);
        let readed: number | null = null;
        do {
            readed = await f.read(buf);
            if (readed) {
                h.update(buf, readed);
            }
        } while (readed !== null);
        return h.digest_hex();
    } finally {
        f.close();
    }
}

export async function calFileSha1(p: string | URL) {
    const h = new SHA1();
    const f = await Deno.open(p);
    try {
        const buf = new Uint8Array(65536);
        let readed: number | null = null;
        do {
            readed = await f.read(buf);
            if (readed) {
                h.update(buf, readed);
            }
        } while (readed !== null);
        return h.digest_hex();
    } finally {
        f.close();
    }
}

export async function checkMapFile(p: string | URL, signal?: AbortSignal) {
    if (!(await exists(p))) return false;
    const map = JSON.parse(await Deno.readTextFile(p, { signal }));
    if (
        !(await asyncEvery(
            Object.getOwnPropertyNames(map.inputs),
            async (k) => {
                const data = map.inputs[k];
                const md5 = data.md5;
                if (!md5) return false;
                if (!(await exists(k))) return false;
                const m = await calFileMd5(k);
                return md5 === m;
            },
        ))
    ) return false;
    if (
        !(await asyncEvery(
            Object.getOwnPropertyNames(map.outputs),
            async (k) => {
                const data = map.outputs[k];
                const md5 = data.md5;
                if (!md5) return false;
                if (!(await exists(k))) return false;
                const m = await calFileMd5(k);
                return md5 === m;
            },
        ))
    ) return false;
    return true;
}

export async function asyncEvery<T, V>(
    arr: ArrayLike<T>,
    callback: (
        this: V | undefined,
        element: T,
        index: number,
        array: ArrayLike<T>,
    ) => Promise<boolean>,
    thisArg?: V,
) {
    for (let i = 0; i < arr.length; i++) {
        if (!await callback.apply(thisArg, [arr[i], i, arr])) return false;
    }
    return true;
}

export function map<T, S, V>(
    arr: ArrayLike<T>,
    callback: (
        this: S | undefined,
        element: T,
        index: number,
        array: ArrayLike<T>,
    ) => V,
    thisArg?: S,
) {
    const re: V[] = [];
    for (let i = 0; i < arr.length; i++) {
        re.push(callback.apply(thisArg, [arr[i], i, arr]));
    }
    return re;
}

export class RecoverableError extends Error {}

export class TimeoutError extends RecoverableError {
    constructor() {
        super("Timeout");
    }
}

let _isDocker: boolean | undefined = undefined;

export function isDocker() {
    if (_isDocker === undefined) {
        _isDocker = parse_bool(Deno.env.get("DOCKER") ?? "false");
    }
    return _isDocker;
}

export function toJSON(obj: unknown) {
    return JSON.stringify(
        obj,
        (_, value) => {
            if (typeof value === "bigint") {
                const s = value.toString();
                const t = parseInt(s);
                if (Number.isSafeInteger(t)) return t;
                return s;
            }
            return value;
        },
    );
}

export function parseBigInt(str: string) {
    const t = parseInt(str);
    if (isNaN(t)) return t;
    if (Number.isSafeInteger(t)) return t;
    const m = str.match(/^(\+|-)?\d+/);
    if (!m) return NaN;
    return BigInt(m[0]);
}

export function isNumNaN(num: number | bigint) {
    return typeof num === "number" ? isNaN(num) : false;
}

export function compareNum(num1: number | bigint, num2: number | bigint) {
    return num1 == num2 ? 0 : num1 < num2 ? -1 : 1;
}

const HASH_PATTERN = /^\/h\/([0-9a-f]+)/;
const FHASH_PATTERN = /([0-9a-f]{40})-(\d+)-(\d+)-(\d+)-([^\/]+)/g;
const EXT_MAP: Record<string, string> = {
    ".jpg": "jpg",
    ".png": "png",
    ".webp": "wbp",
};

export function getHashFromUrl(url: string | URL) {
    const u = typeof url === "string" ? new URL(url) : url;
    const m = u.pathname.match(HASH_PATTERN);
    if (m) return m[1];
    if (u.pathname.startsWith("/om/")) {
        const ext = EXT_MAP[extname(u.pathname)];
        const ma = Array.from(u.pathname.matchAll(FHASH_PATTERN));
        const comps = u.pathname.split("/");
        if (ma.length && comps.length > 3) {
            const width = parseInt(comps[comps.length - 3]);
            if (width === 0) {
                return ma[0][1];
            }
            for (const f of ma) {
                if (parseInt(f[3]) <= width && f[5] == ext) {
                    return f[1];
                }
            }
        }
    }
    throw Error(`URL ${url} not contains hash info.`);
}

/**
 * Replaces the file extension of a given path with a new extension.
 *
 * @param path - The original file path from which the extension will be replaced.
 * @param ext - The new extension to be used. If it does not start with a dot, one will be added.
 * @returns The modified file path with the new extension.
 */
export function replaceExtname(path: string, ext: string) {
    if (ext && !ext.startsWith(".")) {
        ext = "." + ext;
    }
    return path.slice(0, path.length - extname(path).length) + ext;
}

export function stackTrace(skip: number = 0) {
    const err = new Error();
    return err.stack?.split("\n").slice(2 + skip).join("\n");
}
