import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import GlobalContext from "../components/GlobalContext.tsx";
import Container from "../islands/Container.tsx";
import { get_i18nmap, i18n_handle_request } from "../server/i18ns.ts";
import { UserAgent } from "std/http/user_agent.ts";

type Props = {
    lang: string;
    userAgent: string | null;
};

export const handler: Handlers<Props> = {
    GET(req, ctx) {
        const re = i18n_handle_request(req);
        if (typeof re === "string") {
            return ctx.render({
                lang: re,
                userAgent: req.headers.get("User-Agent"),
            });
        }
        return re;
    },
};

export default function Index({ data }: PageProps<Props>) {
    const i18n = get_i18nmap(data.lang);
    const ua = new UserAgent(data.userAgent || "");
    const is_windows_chrome = ua.browser.name === "Chrome" &&
        ua.os.name === "Windows";
    return (
        <body>
            <Head>
                {is_windows_chrome
                    ? <link rel="stylesheet" href="scrollBar.css" />
                    : null}
            </Head>
            <GlobalContext>
                <Container i18n={i18n} lang={data.lang} />
            </GlobalContext>
        </body>
    );
}
