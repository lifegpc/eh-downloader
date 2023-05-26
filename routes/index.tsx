import { Head } from "$fresh/runtime.ts";
import GlobalContext from "../components/GlobalContext.tsx";
import Container from "../islands/Container.tsx";

export default function Index() {
    return (
        <body>
            <GlobalContext>
                <Head>
                    <title>EH Downloader</title>
                </Head>
                <Container />
            </GlobalContext>
        </body>
    );
}
