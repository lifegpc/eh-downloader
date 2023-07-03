export function parse_cookies(c: string | null) {
    const m = new Map<string, string>();
    if (c === null) return m;
    for (const a of c.split(";")) {
        const b = a.trim();
        const d = b.split("=");
        if (d.length > 1) {
            m.set(d[0], d.slice(1).join("="));
        }
    }
    return m;
}
