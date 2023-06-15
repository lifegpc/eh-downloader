import { exists } from "std/fs/exists.ts";
import mime from "mime";
import { parse_range } from "./range_parser.ts";

export type GetFileResponseOptions = {
    boundary?: string;
    /**@default {4096} */
    chunk?: number;
    /**@default {false} */
    combineRange?: boolean;
    if_modified_since?: string;
    if_unmodified_since?: string;
    mimetype?: string;
    range?: string;
};

export async function get_file_response(
    path: string,
    opts?: GetFileResponseOptions,
) {
    if (!(await exists(path, { isFile: true, isReadable: true }))) {
        return new Response("404 not found.", { status: 404 });
    }
    const i = await Deno.stat(path);
    const mimetype = opts && opts.mimetype ? opts.mimetype : mime.getType(path);
    if (opts?.if_modified_since && i.mtime) {
        const s = i.mtime.toUTCString();
        if (opts.if_modified_since === s) {
            return new Response(null, { status: 304 });
        }
    }
    const f = await Deno.open(path);
    const close_f = () => {
        try {
            f.close();
        } catch (_) {
            null;
        }
    };
    const chunk = opts && opts.chunk && opts.chunk > 0 ? opts.chunk : 4096;
    try {
        if (opts && opts.range) {
            if (opts.if_unmodified_since && i.mtime) {
                const s = i.mtime.toUTCString();
                if (opts.if_unmodified_since !== s) {
                    return new Response("", { status: 412 });
                }
            }
            const combine = opts.combineRange || false;
            const ranges = parse_range(i.size, opts.range, combine);
            if (ranges === -1) {
                return new Response("Malformed header: range.", {
                    status: 400,
                });
            } else if (ranges === -2 || ranges.type !== "bytes") {
                return new Response("Range Not Satisfiable", { status: 416 });
            }
            if (ranges.length === 1) {
                const start = ranges[0].start;
                const end = ranges[0].end + 1;
                let now = start;
                await f.seek(now, Deno.SeekMode.Start);
                const readInto = async (s: Uint8Array) => {
                    if (now === end) return null;
                    try {
                        const n = await f.read(s);
                        if (n === null) return null;
                        const readed = Math.min(n, end - now);
                        now += readed;
                        return readed;
                    } catch (e) {
                        close_f();
                        throw e;
                    }
                };
                const readable = new ReadableStream({
                    pull: async (c) => {
                        if (c.byobRequest) {
                            const r = c.byobRequest;
                            if (r.view) {
                                const v = new Uint8Array(
                                    r.view.buffer,
                                    r.view.byteOffset,
                                );
                                const f = await readInto(v);
                                if (f === null) {
                                    c.close();
                                    return;
                                } else if (f !== 0) {
                                    r.respond(f);
                                    return;
                                }
                            } else {
                                const v = new Uint8Array(chunk);
                                const f = await readInto(v);
                                if (f === null) {
                                    c.close();
                                    return;
                                } else if (f !== 0) {
                                    r.respondWithNewView(v.slice(0, f));
                                    return;
                                }
                            }
                        } else {
                            const v = new Uint8Array(chunk);
                            const f = await readInto(v);
                            if (f === null) {
                                c.close();
                                return;
                            } else if (f !== 0) {
                                c.enqueue(v.slice(0, f));
                                return;
                            }
                        }
                    },
                    cancel: close_f,
                    type: "bytes",
                });
                const headers: HeadersInit = {
                    "Content-Length": (end - start).toString(),
                    "Content-Range": `bytes ${start}-${end - 1}/${i.size}`,
                };
                if (mimetype) headers["Content-Type"] = mimetype;
                if (i.mtime) headers["Last-Modified"] = i.mtime.toUTCString();
                return new Response(readable, { status: 206, headers });
            } else {
                let ri = 0;
                const boundary = opts.boundary
                    ? encodeURIComponent(opts.boundary)
                    : new Date().getTime().toString();
                let current = ranges[ri];
                let now = current.start;
                await f.seek(now, Deno.SeekMode.Start);
                const encoder = new TextEncoder();
                const boundaries = ranges.map((r) => {
                    const d = [""];
                    const h = new Headers({
                        "Content-Range": `bytes ${r.start}-${r.end}/${i.size}`,
                    });
                    if (mimetype) h.append("Content-Type", mimetype);
                    d.push(`--${boundary}`);
                    h.forEach((v, k) => {
                        d.push(`${k}: ${v}`);
                    });
                    d.push("");
                    d.push("");
                    return encoder.encode(d.join("\r\n"));
                });
                boundaries.push(encoder.encode(`\r\n--${boundary}--`));
                const len = boundaries.reduce((p, c) => p + c.length, 0) +
                    ranges.reduce((p, r) => p + r.end + 1 - r.start, 0);
                let current_boundary = boundaries[ri];
                let cb = current_boundary.length;
                const readInto = async (
                    s: Uint8Array,
                ): Promise<number | null> => {
                    try {
                        if (cb > 0) {
                            const readed = Math.min(s.length, cb);
                            s.set(current_boundary.slice(0, readed));
                            current_boundary.set(
                                current_boundary.slice(readed),
                                0,
                            );
                            cb -= readed;
                            return readed;
                        }
                        if (now === current.end + 1) {
                            ri++;
                            if (ri < ranges.length) {
                                current = ranges[ri];
                                now = current.start;
                                current_boundary = boundaries[ri];
                                cb = current_boundary.length;
                                await f.seek(now, Deno.SeekMode.Start);
                                return await readInto(s);
                            } else {
                                if (ri === ranges.length) {
                                    current_boundary = boundaries[ri];
                                    cb = current_boundary.length;
                                    return await readInto(s);
                                } else return null;
                            }
                        }
                        const n = await f.read(s);
                        if (n === null) return 0;
                        const readed = Math.min(n, current.end + 1 - now);
                        now += readed;
                        return readed;
                    } catch (e) {
                        close_f();
                        throw e;
                    }
                };
                const readable = new ReadableStream({
                    pull: async (c) => {
                        if (c.byobRequest) {
                            const r = c.byobRequest;
                            if (r.view) {
                                const v = new Uint8Array(
                                    r.view.buffer,
                                    r.view.byteOffset,
                                );
                                const f = await readInto(v);
                                if (f === null) {
                                    c.close();
                                    return;
                                } else if (f !== 0) {
                                    r.respond(f);
                                    return;
                                }
                            } else {
                                const v = new Uint8Array(chunk);
                                const f = await readInto(v);
                                if (f === null) {
                                    c.close();
                                    return;
                                } else if (f !== 0) {
                                    r.respondWithNewView(v.slice(0, f));
                                    return;
                                }
                            }
                        } else {
                            const v = new Uint8Array(chunk);
                            const f = await readInto(v);
                            if (f === null) {
                                c.close();
                                return;
                            } else if (f !== 0) {
                                c.enqueue(v.slice(0, f));
                                return;
                            }
                        }
                    },
                    cancel: close_f,
                    type: "bytes",
                });
                const headers: HeadersInit = {
                    "Content-Length": len.toString(),
                    "Content-Type":
                        `multipart/byteranges; boundary=${boundary}`,
                };
                if (i.mtime) headers["Last-Modified"] = i.mtime.toUTCString();
                return new Response(readable, { status: 206, headers });
            }
        } else {
            const headers: HeadersInit = {
                "Content-Length": i.size.toString(),
            };
            if (mimetype) headers["Content-Type"] = mimetype;
            if (i.mtime) headers["Last-Modified"] = i.mtime.toUTCString();
            return new Response(f.readable, { headers });
        }
    } catch (e) {
        close_f();
        throw e;
    }
}
