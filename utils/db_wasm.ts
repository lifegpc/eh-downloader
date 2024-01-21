import { DB, SqliteOptions } from "sqlite/mod.ts";

export class DbWasm extends DB {
    constructor(dbPath: string, options?: SqliteOptions) {
        super(dbPath, options);
    }
}
