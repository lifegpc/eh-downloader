import { join } from "std/path/mod.ts";
import { filterFilename } from "../utils.ts";
import type { EhFile } from "../db.ts";

export enum ThumbnailGenMethod {
    Unknown,
    Cover,
    Contain,
    Fill,
}

export type ThumbnailConfig = {
    width: number;
    height: number;
    quality: number;
    method: ThumbnailGenMethod;
};

export function generate_filename(
    base: string,
    f: EhFile,
    cfg: ThumbnailConfig,
) {
    let method = "";
    switch (cfg.method) {
        case ThumbnailGenMethod.Cover:
            method = "-cover";
            break;
        case ThumbnailGenMethod.Contain:
            method = "-contain";
            break;
        case ThumbnailGenMethod.Fill:
            method = "-fill";
            break;
    }
    return join(
        base,
        filterFilename(
            `${f.id}-${f.token}-${cfg.width}x${cfg.height}-q${cfg.quality}${method}.jpg`,
        ),
    );
}
