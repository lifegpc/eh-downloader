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

export async function fb_get_size(i: string) {
    const cmd = new Deno.Command("ffprobe", {
        stdout: "piped",
        stderr: "piped",
        args: [
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=s=x:p=0",
            i,
        ],
    });
    const c = cmd.spawn();
    const o = await c.output();
    if (o.code !== 0) {
        return null;
    }
    const s = (new TextDecoder()).decode(o.stdout).trim().split("x");
    return {
        width: parseInt(s[0]),
        height: parseInt(s[1]),
    };
}

export async function fb_generate_thumbnail(
    p: string,
    i: string,
    o: string,
    cfg: ThumbnailConfig,
) {
    const args = [
        "-n",
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
