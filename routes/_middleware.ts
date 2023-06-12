import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { build } from "esbuild/mod.js";
import { join, resolve } from "std/path/mod.ts";
import { asyncForEach, calFileMd5, checkMapFile } from "../utils.ts";

export async function handler(req: Request, ctx: MiddlewareHandlerContext) {
    const url = new URL(req.url);
    if (url.pathname == "/sw.js") {
        const base = import.meta.resolve("../static").slice(8);
        const map_file = join(base, "sw.meta.json");
        if (!(await checkMapFile(map_file))) {
            const data = await build({
                entryPoints: [join(base, "sw.ts")],
                outfile: join(base, "sw.js"),
                metafile: true,
                bundle: true,
                minify: true,
                sourcemap: true,
            });
            const map = data.metafile;
            await asyncForEach(
                Object.getOwnPropertyNames(map.inputs),
                async (k) => {
                    const p = resolve(k);
                    if (p !== k) {
                        map.inputs[p] = map.inputs[k];
                        delete map.inputs[k];
                        k = p;
                    }
                    const data = map.inputs[k];
                    data.md5 = await calFileMd5(k);
                },
            );
            await asyncForEach(
                Object.getOwnPropertyNames(map.outputs),
                async (k) => {
                    const p = resolve(k);
                    if (p !== k) {
                        map.outputs[p] = map.outputs[k];
                        delete map.outputs[k];
                        k = p;
                    }
                    const data = map.outputs[k];
                    data.md5 = await calFileMd5(k);
                },
            );
            await Deno.writeTextFile(map_file, JSON.stringify(map));
            console.log("Rebuild.");
        }
    }
    const res = await ctx.next();
    if (url.pathname == "/sw.js") {
        res.headers.delete("etag");
    }
    return res;
}
