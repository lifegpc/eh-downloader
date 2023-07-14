import type { ExtendedPMeta, GMeta, Tag } from "../db.ts";
import { JSONResult } from "./utils.ts";

export type GalleryData = {
    meta: GMeta;
    tags: Tag[];
    pages: ExtendedPMeta[];
};

export type GalleryResult = JSONResult<GalleryData>;

export type GalleryListResult = JSONResult<GMeta[]>;
