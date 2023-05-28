import { signal } from "@preact/signals";

export type I18NMap = { [x: string]: string | I18NMap };

export const i18n_map = signal<I18NMap>({});
const NOT_FOUND = "__NOT_FOUND__";

export default function t(key: string) {
    const keys = key.split(".");
    let map: string | I18NMap = i18n_map.value;
    for (const k of keys) {
        if (typeof map === "string") return NOT_FOUND;
        else map = map[k];
    }
    return typeof map === "string" ? map : NOT_FOUND;
}
