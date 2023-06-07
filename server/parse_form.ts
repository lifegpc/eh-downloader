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
