export type EhFileBasic = {
    id: number | bigint;
    width: number | bigint;
    height: number | bigint;
    is_original: boolean;
};

export type EhFileExtend = {
    id: number | bigint;
    width: number | bigint;
    height: number | bigint;
    is_original: boolean;
    token: string;
};

export type EhFiles = Record<string, EhFileBasic[]>;
