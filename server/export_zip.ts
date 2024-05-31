import { Uint8ArrayReader, ZipWriter } from "zipjs/index.js";
import type { EhDb, PMeta } from "../db.ts";
import type { ExportZipConfig } from "../tasks/export_zip.ts";
import {
    addZero,
    compareNum,
    configureZipJs,
    limitFilename,
} from "../utils.ts";

export function get_export_zip_response(
    gid: number | bigint,
    db: EhDb,
    cfg: ExportZipConfig,
) {
    const gmeta = db.get_gmeta_by_gid(gid);
    if (!gmeta) return new Response("Gallery not found.", { status: 404 });
    const pmetas = db.get_pmeta(gid).sort((a, b) =>
        compareNum(a.index, b.index)
    );
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
    configureZipJs();
    const zip_writer = new ZipWriter(s);
    let zip_closed = false;
    let closed = false;
    const signalc = new AbortController();
    const signal = signalc.signal;
    const maxLength = cfg.max_length || 0;
    const download_task = async (p: PMeta) => {
        const f = db.get_files(p.token);
        const t = db.get_filemeta(p.token);
        if (t && t.is_ad && !cfg.export_ad) return;
        if (f.length) {
            const r = await Deno.readFile(f[0].path, { signal });
            await zip_writer.add(
                limitFilename(`${addZero(p.index, l)}_${p.name}`, maxLength),
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
    const title = (cfg.jpn_title && gmeta.title_jpn)
        ? gmeta.title_jpn
        : gmeta.title;
    return new Response(readable, {
        headers: {
            "content-type": "application/zip",
            "Content-Disposition": `attachment; filename*=UTF-8''${
                encodeURIComponent(title)
            }.zip`,
        },
    });
}
