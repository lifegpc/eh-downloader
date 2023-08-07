export type EhFileBasic = {
    id: number;
    width: number;
    height: number;
    is_original: boolean;
};

export type EhFileExtend = {
    id: number;
    width: number;
    height: number;
    is_original: boolean;
    token: string;
};

export type EhFiles = Record<string, EhFileBasic[]>;
