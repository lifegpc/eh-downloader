import { join } from "std/path/mod.ts";
import { filterFilename } from "../utils.ts";
import type { EhFile } from "../db.ts";

export enum ThumbnailGenMethod {
    Unknown,
    Cover,
    Contain,
    Fill,
}

export enum ThumbnailAlign {
    Left,
    Top = 0,
    Center,
    Right,
    Bottom = 2,
}

export type ThumbnailConfig = {
    width: number;
    height: number;
    quality: number;
    method: ThumbnailGenMethod;
    align: ThumbnailAlign;
};

export function gen_thumbnail_config_params(cfg: ThumbnailConfig) {
    return {
        width: cfg.width.toString(),
        height: cfg.height.toString(),
        quality: cfg.quality.toString(),
        method: cfg.method.toString(),
        align: cfg.align.toString(),
    };
}

export function parse_thumbnail_method(s: string | null) {
    if (s === null) return ThumbnailGenMethod.Unknown;
    const t = s.toLowerCase();
    switch (t) {
        case "cover":
            return ThumbnailGenMethod.Cover;
        case "contain":
            return ThumbnailGenMethod.Contain;
        case "fill":
            return ThumbnailGenMethod.Fill;
        default:
            return ThumbnailGenMethod.Unknown;
    }
}

export function parse_thumbnail_align(s: string | null) {
    if (s === null) return ThumbnailAlign.Left;
    const t = s.toLowerCase();
    switch (t) {
        case "center":
            return ThumbnailAlign.Center;
        case "right":
        case "bottom":
            return ThumbnailAlign.Right;
        default:
            return ThumbnailAlign.Left;
    }
}

export function generate_filename(
    base: string,
    f: EhFile,
    cfg: ThumbnailConfig,
) {
    let method = "";
    let balign = "";
    let align = "";
    switch (cfg.align) {
        case ThumbnailAlign.Left:
            balign = "-left";
            break;
        case ThumbnailAlign.Center:
            balign = "-center";
            break;
        case ThumbnailAlign.Right:
            balign = "-right";
            break;
    }
    switch (cfg.method) {
        case ThumbnailGenMethod.Cover:
            method = "-cover";
            align = balign;
            break;
        case ThumbnailGenMethod.Contain:
            method = "-contain";
            align = balign;
            break;
        case ThumbnailGenMethod.Fill:
            method = "-fill";
            break;
    }
    return join(
        base,
        filterFilename(
            `${f.id}-${f.token}-${cfg.width}x${cfg.height}-q${cfg.quality}${method}${align}.jpg`,
        ),
    );
}
