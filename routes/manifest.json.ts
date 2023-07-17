import { Handlers } from "$fresh/server.ts";
import { get_i18nmap, i18n_handle_request } from "../server/i18ns.ts";
import t, { i18n_map } from "../server/i18n.ts";

export const handler: Handlers = {
    GET(req, _ctx) {
        const i18n = i18n_handle_request(req);
        if (typeof i18n === "string") {
            const m = get_i18nmap(i18n);
            i18n_map.value = m;
            const base = `/?lang=${i18n}`;
            const data = {
                name: t("common.title"),
                lang: i18n,
                start_url: base,
                display: "standalone",
                icons: [
                    {
                        src: "/favicon.ico",
                        sizes: "64x64",
                        "type": "image/vnd.microsoft.icon",
                    },
                    {
                        src: "/logo.svg",
                        sizes: "any",
                        "type": "image/svg+xml",
                    },
                ],
                scope: base,
                shortcuts: [
                    {
                        name: t("task.add"),
                        url: `${base}#/task_manager/new`,
                    },
                    {
                        name: t("common.settings"),
                        url: `${base}#/settings`,
                    },
                ],
            };
            return new Response(JSON.stringify(data), {
                headers: { "Content-Type": "application/manifest+json" },
            });
        }
        return i18n;
    },
};
