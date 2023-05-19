export type GalleryMetadataTorrentInfo = {
    hash: string;
    added: string;
    name: string;
    tsize: string;
    fsize: string;
}

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
}

class GalleryMetadata {
    obj;
    constructor(text: string) {
        this.obj = JSON.parse(text);
    }
}

export function load_gallery_metadata(text: string) {
    return new GalleryMetadata(text);
}
