import { exists } from "std/fs/exists.ts";
import { JsonValue, parse } from "std/jsonc/mod.ts";

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
};

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
        return this._return_number("port") || 8000;
    }
    get export_zip_jpn_title() {
        return this._return_bool("export_zip_jpn_title") || false;
    }
    get hostname() {
        return this._return_string("hostname") || "localhost";
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
        };
    }
}

export async function load_settings(path: string) {
    if (!await exists(path)) return new Config({});
    const s = (new TextDecoder()).decode(await Deno.readFile(path));
    return new Config(parse(s));
}

export function save_settings(path: string, cfg: Config, signal?: AbortSignal) {
    return Deno.writeTextFile(path, JSON.stringify(cfg._data), { signal });
}
