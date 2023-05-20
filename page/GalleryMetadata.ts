import { GMeta } from "../db.ts";

export type GalleryMetadataTorrentInfo = {
    hash: string;
    added: string;
    name: string;
    tsize: string;
    fsize: string;
};

export type GalleryMetadataSingle = {
    gid: number;
    token: string;
    archiver_key: string;
    title: string;
    title_jpn: string;
    category: string;
    thumb: string;
    uploader: string;
    posted: string;
    filecount: string;
    filesize: number;
    expunged: boolean;
    rating: string;
    torrentcount: string;
    torrents: GalleryMetadataTorrentInfo[];
    tags: string[];
    parent_gid: string | undefined;
    parent_key: string | undefined;
    first_gid: string | undefined;
    first_key: string | undefined;
};

class GalleryMetadata {
    obj;
    map: Map<number, GalleryMetadataSingle | string>;
    constructor(text: string) {
        this.obj = JSON.parse(text);
        this.map = new Map();
        for (const m of this.obj["gmetadata"]) {
            this.map.set(m.gid, m.error ? m.error : m);
        }
    }
    convert(g: GalleryMetadataSingle): GMeta {
        return {
            gid: g.gid,
            token: g.token,
            title: g.title,
            title_jpn: g.title_jpn,
            category: g.category,
            uploader: g.uploader,
            posted: parseInt(g.posted),
            filecount: parseInt(g.filecount),
            filesize: g.filesize,
            expunged: g.expunged,
            rating: parseFloat(g.rating),
            parent_gid: g.parent_gid ? parseInt(g.parent_gid) : null,
            parent_key: g.parent_key ? g.parent_key : null,
            first_gid: g.first_gid ? parseInt(g.first_gid) : null,
            first_key: g.first_key ? g.first_key : null,
        };
    }
}

export function load_gallery_metadata(text: string) {
    return new GalleryMetadata(text);
}
