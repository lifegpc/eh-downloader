export function parse_bool<T extends boolean | null>(
    value: string | null,
    def: T,
): boolean | T {
    if (value === null) return def;
    const v = value.toLowerCase();
    const n = parseInt(v);
    if (isNaN(n)) {
        return v === "true";
    } else {
        return n !== 0;
    }
}

export function parse_int<T extends number | null>(
    value: string | null,
    def: T,
): number | T {
    if (value === null) return def;
    const n = parseInt(value);
    if (isNaN(n)) return def;
    return n;
}
