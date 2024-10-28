export class SortableURLSearchParams extends URLSearchParams {
    excludes;
    constructor(
        init?: string[][] | Record<string, string> | string | URLSearchParams,
        excludes: string[] = [],
    ) {
        super(init);
        this.excludes = excludes;
    }
    // @ts-ignore Fuck
    entries(): IterableIterator<[string, string]> {
        this.sort();
        const a: [string, string][] = [];
        for (const i of super.entries()) {
            if (!this.excludes.includes(i[0])) a.push(i);
        }
        return a.values();
    }
    // @ts-ignore Fuck
    forEach(
        callbackfn: (value: string, key: string, parent: this) => void,
        thisArg?: unknown,
    ): void {
        for (const [k, v] of this.entries()) {
            callbackfn.apply(thisArg, [v, k, this]);
        }
    }
    // @ts-ignore Fuck
    keys(): IterableIterator<string> {
        this.sort();
        const a: string[] = [];
        for (const i of super.keys()) {
            if (!this.excludes.includes(i)) a.push(i);
        }
        return a.values();
    }
    // @ts-ignore Fuck
    toString(): string {
        return Array.from(this.entries()).map((v) =>
            `${encodeURIComponent(v[0])}=${encodeURIComponent(v[1])}`
        ).join("&");
    }
    toString2(): string {
        const s = this.toString();
        return s.length ? `?${s}` : "";
    }
    // @ts-ignore Fuck
    values(): IterableIterator<string> {
        return Array.from(this.entries()).map((v) => v[1]).values();
    }
}
