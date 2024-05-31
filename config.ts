import { exists } from "@std/fs/exists";
import { JsonValue, parse } from "@std/jsonc";
import { isDocker } from "./utils.ts";

export type ConfigType = {
    cookies: boolean;
    db_path?: string;
    ua?: string;
    ex: boolean;
    base: string;
    max_task_count: number;
    mpv: boolean;
    max_retry_count: number;
    max_download_img_count: number;
    download_original_img: boolean;
    port: number;
    export_zip_jpn_title: boolean;
    hostname: string;
    meili_host?: string;
    meili_search_api_key?: string;
    meili_update_api_key?: string;
    ffmpeg_path: string;
    thumbnail_method: ThumbnailMethod;
    thumbnail_dir: string;
    remove_previous_gallery: boolean;
    img_verify_secret?: string;
    meili_hosts?: Record<string, string>;
    cors_credentials_hosts: Array<string>;
    flutter_frontend?: string;
    fetch_timeout: number;
    download_timeout: number;
    ffprobe_path: string;
    redirect_to_flutter: boolean;
    download_timeout_check_interval: number;
    /** EH metadata cache time in hours */
    eh_metadata_cache_time: number;
    random_file_secret?: string;
};

export enum ThumbnailMethod {
    FFMPEG_BINARY,
    FFMPEG_API,
}

export class Config {
    _data;
    constructor(data: JsonValue) {
        this._data = <{ [x: string]: unknown }> <unknown> Object.assign(
            {},
            data,
        );
    }
    _return_string(key: string) {
        const v = this._data[key];
        if (v === undefined || typeof v === "string") {
            return v;
        }
        throw new Error(`Config ${key} value ${v} is not a string`);
    }
    _return_number(key: string) {
        const v = this._data[key];
        if (v === undefined) return undefined;
        if (typeof v === "number") {
            return v;
        }
        throw new Error(`Config ${key} value ${v} is not a number`);
    }
    _return_bool(key: string) {
        const v = this._data[key];
        if (v === undefined) {
            return v;
        }
        if (typeof v === "boolean") {
            return v;
        } else if (typeof v === "string") {
            if (v === "true") {
                return true;
            } else if (v === "false") {
                return false;
            }
        } else if (typeof v === "number") {
            return v != 0;
        }
        throw new Error(`Config ${key} value ${v} is not a boolean`);
    }
    get cookies() {
        return this._return_string("cookies");
    }
    get db_path() {
        if (isDocker()) {
            return this._return_string("db_path") || "./data";
        }
        return this._return_string("db_path");
    }
    get ua() {
        return this._return_string("ua");
    }
    get ex() {
        return this._return_bool("ex") || false;
    }
    get base() {
        return this._return_string("base") || "./downloads";
    }
    get max_task_count() {
        return this._return_number("max_task_count") || 1;
    }
    get mpv() {
        return this._return_bool("mpv") || false;
    }
    get max_retry_count() {
        return this._return_number("max_retry_count") || 3;
    }
    get max_download_img_count() {
        return this._return_number("max_download_img_count") || 3;
    }
    get download_original_img() {
        return this._return_bool("download_original_img") || false;
    }
    get port() {
        if (isDocker()) {
            return 8000;
        }
        return this._return_number("port") || 8000;
    }
    get export_zip_jpn_title() {
        return this._return_bool("export_zip_jpn_title") || false;
    }
    get hostname() {
        if (isDocker()) {
            return "0.0.0.0";
        }
        return this._return_string("hostname") || "127.0.0.1";
    }
    get meili_host() {
        return this._return_string("meili_host");
    }
    get meili_search_api_key() {
        return this._return_string("meili_search_api_key");
    }
    get meili_update_api_key() {
        return this._return_string("meili_update_api_key");
    }
    get ffmpeg_path() {
        return this._return_string("ffmpeg_path") || "ffmpeg";
    }
    get thumbnail_method() {
        const n = this._return_number("thumbnail_method") || 0;
        if (n < 0 || n > 1) return ThumbnailMethod.FFMPEG_BINARY;
        return n as ThumbnailMethod;
    }
    get thumbnail_dir() {
        return this._return_string("thumbnail_dir") || "./thumbnails";
    }
    get remove_previous_gallery() {
        return this._return_bool("remove_previous_gallery") || false;
    }
    get img_verify_secret() {
        return this._return_string("img_verify_secret");
    }
    get meili_hosts() {
        if (typeof this._data.meili_hosts === "object") {
            const hosts: Record<string, string> = {};
            for (const i in this._data.meili_hosts) {
                /**@ts-ignore Object*/
                const v = this._data.meili_hosts[i];
                if (typeof v === "string") hosts[i] = v;
            }
            return hosts;
        }
        return undefined;
    }
    get cors_credentials_hosts(): Array<string> {
        if (Array.isArray(this._data.cors_credentials_hosts)) {
            const hosts: Array<string> = [];
            for (const i of this._data.cors_credentials_hosts) {
                if (typeof i === "string") hosts.push(i);
            }
            return hosts;
        }
        return [];
    }
    get flutter_frontend() {
        return this._return_string("flutter_frontend");
    }
    get fetch_timeout() {
        return this._return_number("fetch_timeout") || 10000;
    }
    get download_timeout() {
        return this._return_number("download_timeout") || 2000;
    }
    get ffprobe_path() {
        return this._return_string("ffprobe_path") || "ffprobe";
    }
    get redirect_to_flutter() {
        return this._return_bool("redirect_to_flutter") ?? true;
    }
    get download_timeout_check_interval() {
        return this._return_number("download_timeout_check_interval") || 10;
    }
    /** EH metadata cache time in hours */
    get eh_metadata_cache_time() {
        return this._return_number("eh_metadata_cache_time") || 168;
    }
    get random_file_secret() {
        return this._return_string("random_file_secret");
    }
    to_json(): ConfigType {
        return {
            cookies: typeof this.cookies === "string",
            db_path: this.db_path,
            ua: this.ua,
            ex: this.ex,
            base: this.base,
            max_task_count: this.max_task_count,
            mpv: this.mpv,
            max_retry_count: this.max_retry_count,
            max_download_img_count: this.max_download_img_count,
            download_original_img: this.download_original_img,
            port: this.port,
            export_zip_jpn_title: this.export_zip_jpn_title,
            hostname: this.hostname,
            meili_host: this.meili_host,
            meili_search_api_key: this.meili_search_api_key,
            meili_update_api_key: this.meili_update_api_key,
            ffmpeg_path: this.ffmpeg_path,
            thumbnail_method: this.thumbnail_method,
            thumbnail_dir: this.thumbnail_dir,
            remove_previous_gallery: this.remove_previous_gallery,
            img_verify_secret: this.img_verify_secret,
            meili_hosts: this.meili_hosts,
            cors_credentials_hosts: this.cors_credentials_hosts,
            flutter_frontend: this.flutter_frontend,
            fetch_timeout: this.fetch_timeout,
            download_timeout: this.download_timeout,
            ffprobe_path: this.ffprobe_path,
            redirect_to_flutter: this.redirect_to_flutter,
            download_timeout_check_interval:
                this.download_timeout_check_interval,
            eh_metadata_cache_time: this.eh_metadata_cache_time,
            random_file_secret: this.random_file_secret,
        };
    }
}

export async function load_settings(path: string) {
    if (!await exists(path)) return new Config({});
    let s = (new TextDecoder()).decode(await Deno.readFile(path));
    while (!s.length) {
        s = (new TextDecoder()).decode(await Deno.readFile(path));
    }
    return new Config(parse(s));
}

export function save_settings(path: string, cfg: Config, signal?: AbortSignal) {
    return Deno.writeTextFile(path, JSON.stringify(cfg._data), { signal });
}
