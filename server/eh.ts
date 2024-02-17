import type { JSONResult } from "./utils.ts";
import type { GalleryMetadataSingle } from "../page/GalleryMetadata.ts";

export type EHImageLimit = {
    current: number;
    max: number;
};

export type EHMetaInfo = Record<string, JSONResult<GalleryMetadataSingle>>;
