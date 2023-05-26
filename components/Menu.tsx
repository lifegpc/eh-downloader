import { Head } from "$fresh/runtime.ts";
import { Component } from "preact";
import { ContextType } from "preact";
import TopAppBar from "preact-material-components/TopAppBar";
import StyleSheet from "./StyleSheet.tsx";
import { GlobalCtx } from "./GlobalContext.tsx";

export default class Menu extends Component {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        return (
            <div>
                <Head>
                    <GlobalCtx.Provider value={this.context}>
                        <StyleSheet href="https://fonts.googleapis.com/icon?family=Material+Icons" />
                        <StyleSheet href="preact-material-components/TopAppBar/style.css" />
                    </GlobalCtx.Provider>
                </Head>
                <TopAppBar onNav={() => {}}>
                    <TopAppBar.Row>
                        <TopAppBar.Section align-start>
                            <TopAppBar.Icon navigation>menu</TopAppBar.Icon>
                            <TopAppBar.Title>
                                EH Downloader
                            </TopAppBar.Title>
                        </TopAppBar.Section>
                        <TopAppBar.Section align-end>
                            <TopAppBar.Icon>more_vert</TopAppBar.Icon>
                        </TopAppBar.Section>
                    </TopAppBar.Row>
                </TopAppBar>
            </div>
        );
    }
}
