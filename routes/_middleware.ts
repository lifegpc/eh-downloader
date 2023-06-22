import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { build } from "esbuild/mod.js";
import { join, resolve } from "std/path/mod.ts";
import { asyncForEach, calFileMd5, checkMapFile } from "../utils.ts";
import {
    get_file_response,
    GetFileResponseOptions,
} from "../server/get_file_response.ts";

const STATIC_FILES = ["/sw.js", "/sw.js.map"];

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
                    // @ts-ignore add custom property
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
                    // @ts-ignore add custom property
                    data.md5 = await calFileMd5(k);
                },
            );
            await Deno.writeTextFile(map_file, JSON.stringify(map));
            console.log("Rebuild.");
        }
    }
    if (STATIC_FILES.includes(url.pathname)) {
        const base = import.meta.resolve("../static").slice(8);
        const file = join(base, url.pathname.slice(1));
        const opts: GetFileResponseOptions = {};
        opts.range = req.headers.get("Range");
        opts.if_modified_since = req.headers.get("If-Modified-Since");
        if (file.endsWith(".js.map")) {
            opts.mimetype = "application/json";
        }
        return get_file_response(file, opts);
    }
    const res = await ctx.next();
    return res;
}
