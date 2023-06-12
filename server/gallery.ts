import { GMeta, PMeta, Tag } from "../db.ts";
import { JSONResult } from "./utils.ts";

export type GalleryData = {
    meta: GMeta;
    tags: Tag[];
    pages: PMeta[];
};

export type GalleryResult = JSONResult<GalleryData>;
