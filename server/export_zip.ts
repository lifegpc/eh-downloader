import { Uint8ArrayReader, ZipWriter } from "zipjs/index.js";
import { EhDb, PMeta } from "../db.ts";
import { addZero } from "../utils.ts";

export function get_export_zip_response(gid: number, db: EhDb) {
    const gmeta = db.get_gmeta_by_gid(gid);
    if (!gmeta) throw Error("Gallery not found.");
    const pmetas = db.get_pmeta(gid).sort((a, b) => a.index - b.index);
    const p = pmetas.length;
    const l = gmeta.filecount.toString().length;
    let c = 0;
    let b = new Uint8Array(0);
    /// Current buffer count
    let bn = 0;
    /// Buffer length
    let bl = 0;
    const readInto = (s: Uint8Array) => {
        const r = Math.min(s.length, bn);
        s.set(b.slice(0, r));
        b.set(b.slice(r));
        bn -= r;
        return r;
    };
    const s = new WritableStream<Uint8Array>({
        write: (d, c) => {
            if (c.signal.aborted) return;
            const s = d.length;
            if (!s) return;
            if (bn + s > bl) {
                bl = bn + s;
                const nb = new Uint8Array(bl);
                nb.set(b);
                b = nb;
            }
            b.set(d, bn);
            bn += s;
        },
    });
    const zip_writer = new ZipWriter(s);
    let zip_closed = false;
    let closed = false;
    const signalc = new AbortController();
    const signal = signalc.signal;
    const download_task = async (p: PMeta) => {
        const f = db.get_files(gid, p.token);
        if (f.length) {
            const r = await Deno.readFile(f[0].path, { signal });
            await zip_writer.add(
                `${addZero(p.index, l)}_${p.name}`,
                new Uint8ArrayReader(r),
                { signal },
            );
        }
    };
    const add_task = async () => {
        if (closed) return true;
        if (c === p) {
            if (!zip_closed) {
                await zip_writer.close();
                zip_closed = true;
                return false;
            }
            return true;
        }
        await download_task(pmetas[c]);
        c += 1;
        return false;
    };
    const readable = new ReadableStream({
        pull: async (c) => {
            while (1) {
                if (c.byobRequest) {
                    const r = c.byobRequest;
                    if (r.view) {
                        const v = new Uint8Array(
                            r.view.buffer,
                            r.view.byteOffset,
                        );
                        const f = readInto(v);
                        if (f !== 0) {
                            r.respond(f);
                            return;
                        }
                    } else {
                        const v = new Uint8Array(bn);
                        const f = readInto(v);
                        if (f !== 0) {
                            r.respondWithNewView(v.slice(0, f));
                            return;
                        }
                    }
                } else {
                    const v = new Uint8Array(bn);
                    const f = readInto(v);
                    if (f !== 0) {
                        c.enqueue(v.slice(0, f));
                        return;
                    }
                }
                if (await add_task()) {
                    c.close();
                    return;
                }
            }
        },
        cancel: async () => {
            signalc.abort();
            if (!zip_closed) {
                await zip_writer.close();
                zip_closed = true;
            }
            closed = true;
        },
        type: "bytes",
    });
    return new Response(readable, {
        headers: {
            "content-type": "application/zip",
            "Content-Disposition": `attachment; filename="${
                encodeURIComponent(gmeta.title)
            }.zip"`,
        },
    });
}
