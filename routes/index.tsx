import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import GlobalContext from "../components/GlobalContext.tsx";
import Container from "../islands/Container.tsx";
import { get_i18nmap, i18n_handle_request } from "../server/i18ns.ts";

export const handler: Handlers<string> = {
    GET(req, ctx) {
        const re = i18n_handle_request(req);
        if (typeof re === "string") return ctx.render(re);
        return re;
    },
};

export default function Index({ data }: PageProps<string>) {
    const i18n = get_i18nmap(data);
    return (
        <body>
            <GlobalContext>
                <Container i18n={i18n} />
            </GlobalContext>
        </body>
    );
}
