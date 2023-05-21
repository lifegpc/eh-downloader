export class Config {
    _data;
    constructor(data: { [x: string]: unknown }) {
        this._data = Object.assign({}, data);
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
}

export async function load_settings(path: string) {
    const s = (new TextDecoder()).decode(await Deno.readFile(path));
    return new Config(JSON.parse(s));
}
