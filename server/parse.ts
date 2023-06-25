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
