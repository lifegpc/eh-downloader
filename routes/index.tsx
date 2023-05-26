import { Head } from "$fresh/runtime.ts";
import GlobalContext from "../components/GlobalContext.tsx";
import Menu from "../components/Menu.tsx";
import StyleSheet from "../components/StyleSheet.tsx";

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
