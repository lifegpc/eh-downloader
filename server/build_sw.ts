import { build } from "esbuild/mod.js";
import { join, resolve } from "@std/path";
import { asyncForEach, calFileMd5, checkMapFile } from "../utils.ts";

export async function build_sw() {
    let base = import.meta.resolve("../static").slice(7);
    if (Deno.build.os === "windows") {
        base = base.slice(1);
    }
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
