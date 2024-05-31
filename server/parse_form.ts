import { isNumNaN, parseBigInt } from "../utils.ts";

export async function get_string(value: FormDataEntryValue | null) {
    if (value === null) return null;
    return typeof value === "string" ? value : await value.text();
}

export async function parse_bool<T extends boolean | null>(
    value: FormDataEntryValue | null,
    def: T,
): Promise<boolean | T> {
    if (value === null) return def;
    const nv = typeof value === "string" ? value : await value.text();
    const v = nv.toLowerCase();
    const n = parseInt(v);
    if (isNaN(n)) {
        return v === "true";
    } else {
        return n !== 0;
    }
}

export async function parse_int<T extends number | null>(
    value: FormDataEntryValue | null,
    def: T,
): Promise<number | T> {
    if (value === null) return def;
    const v = typeof value === "string" ? value : await value.text();
    const n = parseInt(v);
    if (isNaN(n)) return def;
    return n;
}

export async function parse_big_int<T extends number | bigint | null>(
    value: FormDataEntryValue | null,
    def: T,
): Promise<number | bigint | T> {
    if (value === null) return def;
    const v = typeof value === "string" ? value : await value.text();
    const n = parseBigInt(v);
    if (isNumNaN(n)) return def;
    return n;
}
