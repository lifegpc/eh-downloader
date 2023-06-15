export type Range = {
    start: number;
    end: number;
};
export type Ranges = Range[] & { type: string };

export function parse_range(size: number, str: string, combine = false) {
    const index = str.indexOf("=");
    if (index === -1) {
        return -2;
    }
    const arr = str.slice(index + 1).split(",");
    /**@ts-ignore */
    const ranges = [] as Ranges;
    ranges.type = str.slice(0, index);
    for (const r of arr) {
        const range = r.split("-");
        let start = parseInt(range[0], 10);
        let end = parseInt(range[1], 10);
        if (isNaN(start)) {
            start = size - end;
            end = size - 1;
        } else if (isNaN(end)) {
            end = size - 1;
        }
        if (end > size - 1) {
            end = size - 1;
        }
        if (isNaN(start) || isNaN(end) || start > end || start < 0) {
            continue;
        }
        ranges.push({
            start: start,
            end: end,
        });
    }
    if (ranges.length < 1) return -1;
    return combine ? combineRanges(ranges) : ranges;
}

function combineRanges(ranges: Ranges) {
    const ordered = ranges.map((r, index) => {
        return { start: r.start, end: r.end, index };
    }).sort((a, b) => a.start - b.start);
    let j = 0;
    for (let i = 1; i < ordered.length; i++) {
        const range = ordered[i];
        const current = ordered[j];
        if (range.start > current.end + 1) {
            ordered[++j] = range;
        } else if (range.end > current.end) {
            current.end = range.end;
            current.index = Math.min(current.index, range.index);
        }
    }
    ordered.length = j + 1;
    const combined: Range[] = ordered.sort((a, b) => a.index - b.index).map(
        (d) => {
            return { start: d.start, end: d.end };
        },
    );
    /**@ts-ignore */
    const r = combined as Ranges;
    r.type = ranges.type;
    return r;
}
