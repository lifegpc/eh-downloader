import { Head } from "$fresh/runtime.ts";
import GlobalContext from "../components/GlobalContext.tsx";
import Menu from "../islands/Menu.tsx";

export default function Index() {
    return (
        <body>
            <GlobalContext>
                <Head>
                    <title>EH Downloader</title>
                </Head>
                <Menu></Menu>
            </GlobalContext>
        </body>
    );
}
