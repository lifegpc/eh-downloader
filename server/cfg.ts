import { signal } from "@preact/signals";
import { ConfigType } from "../config.ts";
import { get_ws_host } from "./utils.ts";
import { ConfigClientSocketData, ConfigSeverSocketData } from "./config.ts";

export const cfg = signal<ConfigType | undefined>(undefined);

export function initCfg() {
    const ws = new WebSocket(`${get_ws_host()}/api/config?current=1&type=ws`);
    console.log(ws);
    function sendMessage(mes: ConfigClientSocketData) {
        ws.send(JSON.stringify(mes));
    }
    ws.onmessage = (e) => {
        const d: ConfigSeverSocketData = JSON.parse(e.data);
        if (d.type === "close") {
            ws.close();
        } else if (d.type === "cfg") {
            cfg.value = d.cfg;
        }
    };
    self.addEventListener("beforeunload", () => {
        sendMessage({ type: "close" });
    });
}
