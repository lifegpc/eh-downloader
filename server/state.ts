import { signal } from "@preact/signals";
import { StateUpdater } from "preact/hooks";

export const state = signal("#/");
let listener: StateUpdater<string> | undefined = undefined;

export function initState(l: StateUpdater<string>) {
    const hash = document.location.hash;
    listener = l;
    if (!hash || hash == "#") {
        set_state("#/");
    } else {
        set_state(hash);
    }
    self.addEventListener("popstate", (e) => {
        const s = e.state;
        if (typeof s === "string") {
            l(s);
        } else {
            l("#/");
        }
    });
}

export const set_state: StateUpdater<string> = (updater) => {
    const v = typeof updater === "function" ? updater(state.value) : updater;
    state.value = v;
    history.pushState(v, "", v);
    if (listener) listener(v);
};
