import type { ThumbnailConfig } from "./base.ts";

export async function check_ffmpeg_binary(p: string) {
    const cmd = new Deno.Command(p, {
        stdout: "null",
        stderr: "null",
        args: ["-h"],
    });
    const c = cmd.spawn();
    const o = await c.output();
    return o.code === 0;
}

export async function fb_generate_thumbnail(
    p: string,
    i: string,
    o: string,
    cfg: ThumbnailConfig,
) {
    const args = [
        "-i",
        i,
        "-vf",
        `scale=${cfg.width}:${cfg.height}`,
        "-qmin",
        `${cfg.quality}`,
        "-qmax",
        `${cfg.quality}`,
        o,
    ];
    const cmd = new Deno.Command(p, { args, stdout: "null", stderr: "piped" });
    const c = cmd.spawn();
    const s = await c.output();
    if (s.code !== 0) {
        try {
            const d = (new TextDecoder()).decode(s.stderr);
            console.log(d);
        } catch (_) {
            console.log(s.stderr);
        }
    }
    return s.code === 0;
}
