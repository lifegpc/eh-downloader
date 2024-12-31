export type Row = Array<unknown>;
export type RowObject = Record<string, unknown>;
export type QueryParameter =
    | boolean
    | number
    | bigint
    | string
    | null
    | undefined
    | Date
    | Uint8Array;
export type QueryParameterSet =
    | Record<string, QueryParameter>
    | Array<QueryParameter>;
export type SqliteMaster = {
    type: string;
    name: string;
    tbl_name: string;
    rootpage: number;
    sql: string;
};

export interface Db {
    close(force?: boolean): void;
    execute(sql: string): void;
    query<R extends Row = Row>(
        sql: string,
        params?: QueryParameterSet,
    ): Array<R>;
    queryEntries<O extends RowObject = RowObject>(
        sql: string,
        params?: QueryParameterSet,
    ): Array<O>;
    transaction<V>(fn: () => V): V;
}
