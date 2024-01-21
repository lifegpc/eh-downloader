import { Database, DatabaseOpenOptions } from "sqlite3/mod.ts";
import { QueryParameterSet, Row, RowObject } from "./db_interface.ts";

export class DbFfi {
    db;
    constructor(path: string, options?: DatabaseOpenOptions) {
        this.db = new Database(path, options);
    }

    close(_force?: boolean) {
        this.db.close();
    }

    execute(sql: string) {
        this.db.exec(sql);
    }

    query<R extends Row = Row>(
        sql: string,
        params?: QueryParameterSet,
    ): Array<R> {
        return this.db.prepare(sql).values(params);
    }

    queryEntries<O extends RowObject = RowObject>(
        sql: string,
        params?: QueryParameterSet,
    ): Array<O> {
        return this.db.prepare(sql).all(params);
    }

    transaction<V>(fn: () => V): V {
        const re = this.db.transaction(fn);
        return re();
    }
}
