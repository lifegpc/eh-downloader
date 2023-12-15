import { Handlers, PageProps } from "$fresh/server.ts";
import GlobalContext from "../components/GlobalContext.tsx";
import Uploader from "../islands/Upload.tsx";
import { get_i18nmap, i18n_handle_request } from "../server/i18ns.ts";

type Props = {
    lang: string;
};

export const handler: Handlers<Props> = {
    GET(req, ctx) {
        const re = i18n_handle_request(req);
        if (typeof re === "string") {
            return ctx.render({
                lang: re,
            });
        }
        return re;
    },
};

export default function Upload({ data }: PageProps<Props>) {
    const i18n = get_i18nmap(data.lang, "upload");
    return (
        <body>
            <GlobalContext>
                <Uploader i18n={i18n} lang={data.lang} />
            </GlobalContext>
        </body>
    );
}
