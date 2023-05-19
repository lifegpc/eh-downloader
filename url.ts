export enum UrlType {
    Gallery,
    MPV,
    Single,
}

export type ParsedUrl = {
    type: UrlType;
    gid: number;
    token: string;
    index: number | undefined;
};

export function parseUrl(url: string) {
    const u = new URL(url, "https://e-hentai.org/");
    if (u.hostname != "e-hentai.org" && u.hostname != "exhentai.org") {
        return undefined;
    }
    let re = u.pathname.match(/s\/([^\/]+)\/(\d+)-(\d+)/);
    if (re != null) {
        return {
            type: UrlType.Single,
            gid: parseInt(re[2]),
            token: re[1],
            index: parseInt(re[3]),
        } as ParsedUrl;
    }
    re = u.pathname.match(/(g|mpv)\/(\d+)\/([^\/]+)/);
    if (re != null) {
        return {
            type: re[1] == "g" ? UrlType.Gallery : UrlType.MPV,
            gid: parseInt(re[2]),
            token: re[3],
        } as ParsedUrl;
    }
}
