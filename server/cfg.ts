import { signal } from "@preact/signals";
import { ConfigType } from "../config.ts";
import { get_ws_host } from "./utils.ts";
import type {
    ConfigClientSocketData,
    ConfigSeverSocketData,
} from "./config.ts";
import type { DownloadConfig } from "../tasks/download.ts";
import type { ExportZipConfig } from "../tasks/export_zip.ts";

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

export function generate_download_cfg(): DownloadConfig {
    if (!cfg.value) return {};
    const c = cfg.value;
    return {
        download_original_img: c.download_original_img,
        max_download_img_count: c.max_download_img_count,
        max_retry_count: c.max_retry_count,
        mpv: c.mpv,
        remove_previous_gallery: c.remove_previous_gallery,
    };
}

export function generate_export_zip_cfg(): ExportZipConfig {
    if (!cfg.value) return {};
    const c = cfg.value;
    return {
        jpn_title: c.export_zip_jpn_title,
    };
}
