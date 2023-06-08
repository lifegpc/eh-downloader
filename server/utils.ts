export function get_ws_host() {
    const protocol = document.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${document.location.host}`;
}
