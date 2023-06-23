export type EhFileBasic = {
    id: number;
    width: number;
    height: number;
    is_original: boolean;
};

export type EhFiles = Record<string, EhFileBasic[]>;
