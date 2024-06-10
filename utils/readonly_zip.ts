import * as lz from "@lifegpc/libzip/raw";

function get_err(err: number) {
    const e = lz.ZipErrorT.new();
    lz.zip_error_init_with_code(e, err);
    const s = lz.zip_error_strerror(e);
    lz.zip_error_fini(e);
    return s;
}

class ZipFile {
    #file: lz.ZipFileT;
    #closed = false;
    constructor(f: lz.ZipFileT) {
        this.#file = f;
    }

    #check_close() {
        if (this.#closed) throw Error("Already closed.");
    }

    close() {
        if (this.#closed) return;
        this.#closed = true;
        const er = lz.zip_fclose(this.#file);
        if (er) {
            throw Error(`Failed to close file: ${get_err(er)}`);
        }
    }

    read(buf: Uint8Array) {
        this.#check_close();
        const num = lz.zip_fread(this.#file, buf);
        if (num == -1) {
            throw Error(
                `Failed to read file: ${lz.zip_file_strerror(this.#file)}`,
            );
        }
        return num;
    }
}

export class ReadonlyZip {
    #zip: lz.ZipT;
    #discarded = false;
    #opened_file_list: ZipFile[] = [];
    constructor(path: string) {
        const ep = lz.IntPointer.new();
        const z = lz.zip_open(path, lz.ZipOpenFlag.RDONLY, ep);
        if (!z) {
            throw Error(`Failed to open archive: ${get_err(ep.int)}.`);
        }
        this.#zip = z;
    }
    close() {
        if (this.#discarded) return;
        for (const f of this.#opened_file_list) {
            f.close();
        }
        this.#discarded = true;
        lz.zip_discard(this.#zip);
    }
    get count() {
        return lz.zip_get_num_entries(this.#zip, 0);
    }
    get_index(name: string) {
        return lz.zip_name_locate(this.#zip, name, lz.ZipFlags.ENC_UTF_8);
    }
    get_name(index: number | bigint) {
        return lz.zip_get_name(this.#zip, index, 0);
    }
    open(name: string) {
        const z = lz.zip_fopen(this.#zip, name, lz.ZipFlags.ENC_UTF_8);
        if (!z) {
            const errmsg = lz.zip_strerror(this.#zip);
            return errmsg;
        }
        const f = new ZipFile(z);
        this.#opened_file_list.push(f);
        return f;
    }
    open_index(index: number | bigint) {
        const z = lz.zip_fopen_index(this.#zip, index, 0);
        if (!z) {
            const errmsg = lz.zip_strerror(this.#zip);
            return errmsg;
        }
        const f = new ZipFile(z);
        this.#opened_file_list.push(f);
        return f;
    }
}
