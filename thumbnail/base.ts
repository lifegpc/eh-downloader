import { join } from "std/path/mod.ts";
import { filterFilename } from "../utils.ts";
import type { EhFile } from "../db.ts";

export type ThumbnailConfig = {
    width: number;
    height: number;
    quality: number;
};

export function generate_filename(
    base: string,
    f: EhFile,
    cfg: ThumbnailConfig,
) {
    return join(
        base,
        filterFilename(
            `${f.id}-${f.token}-${cfg.width}x${cfg.height}-q${cfg.quality}.jpg`,
        ),
    );
}
