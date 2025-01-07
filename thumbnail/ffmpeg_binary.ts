import { ThumbnailFormat } from "../config.ts";
import { ThumbnailAlign } from "./base.ts";
import { type ThumbnailConfig, ThumbnailGenMethod } from "./base.ts";
import { base_logger } from "../utils/logger.ts";

const logger = base_logger.get_logger("thumbnail-ffmpeg-binary");

export async function check_ffmpeg_binary(p: string) {
    const cmd = new Deno.Command(p, {
        stdout: "null",
        stderr: "null",
        args: ["-h"],
    });
    let c: Deno.ChildProcess | undefined;
    try {
        c = cmd.spawn();
    } catch (_) {
        return false;
    }
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
    fmt: ThumbnailFormat,
) {
    let add = "";
    const codec = fmt == ThumbnailFormat.WEBP ? "libwebp" : "mjpeg";
    if (cfg.method == ThumbnailGenMethod.Cover) {
        const size = cfg.input ?? await fb_get_size(i);
        if (!size) return false;
        const twidth = Math.floor(size.width * cfg.height / size.height);
        const frwidth = Math.floor(twidth > cfg.width ? twidth : cfg.width);
        const frheight = Math.floor(
            twidth > cfg.width
                ? cfg.height
                : size.height * cfg.width / size.width,
        );
        const xy = cfg.align == ThumbnailAlign.Center
            ? ""
            : cfg.align == ThumbnailAlign.Left
            ? ":x=0:y=0"
            : `:x=${frwidth - cfg.width}:y=${frheight - cfg.height}`;
        add =
            `scale=${frwidth}x${frheight},crop=${cfg.width}:${cfg.height}${xy}`;
    } else if (cfg.method == ThumbnailGenMethod.Contain) {
        const size = cfg.input ?? await fb_get_size(i);
        if (!size) return false;
        const twidth = Math.floor(size.width * cfg.height / size.height);
        const frwidth = Math.floor(twidth > cfg.width ? cfg.width : twidth);
        const frheight = Math.floor(
            twidth > cfg.width
                ? size.height * cfg.width / size.width
                : cfg.height,
        );
        const xy = cfg.align == ThumbnailAlign.Center
            ? `:x=${Math.floor((cfg.width - frwidth) / 2)}:y=${
                Math.floor((cfg.height - frheight) / 2)
            }`
            : cfg.align == ThumbnailAlign.Left
            ? ""
            : `:x=${cfg.width - frwidth}:y=${cfg.height - frheight}`;
        add =
            `scale=${frwidth}x${frheight},pad=${cfg.width}:${cfg.height}${xy}:color=white`;
    } else {
        add = `scale=${cfg.width}:${cfg.height}`;
    }
    const args = [
        "-n",
        "-i",
        i,
        "-c",
        codec,
        "-vf",
        add,
        "-qmin",
        `${cfg.quality}`,
        "-qmax",
        `${cfg.quality}`,
        "-f",
        "image2",
    ];
    if (fmt == ThumbnailFormat.WEBP) {
        args.push("-quality", "100");
    }
    args.push(o);
    const cmd = new Deno.Command(p, { args, stdout: "null", stderr: "piped" });
    const c = cmd.spawn();
    const s = await c.output();
    if (s.code !== 0) {
        try {
            const d = (new TextDecoder()).decode(s.stderr);
            logger.warn(d);
        } catch (_) {
            logger.warn(s.stderr);
        }
    }
    return s.code === 0;
}
