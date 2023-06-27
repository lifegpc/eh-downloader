export function detect_darkmode() {
    return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function addDarkModeListener(e: (e: MediaQueryListEvent) => void) {
    return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener(
            "change",
            e,
        );
}
