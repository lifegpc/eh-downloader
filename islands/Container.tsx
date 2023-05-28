import { Head } from "$fresh/runtime.ts";
import { Component, ContextType } from "preact";
import { useState } from "preact/hooks";
import Icon from "preact-material-components/Icon";
import List from "preact-material-components/List";
import TopAppBar from "preact-material-components/TopAppBar";
import StyleSheet from "../components/StyleSheet.tsx";
import { GlobalCtx } from "../components/GlobalContext.tsx";
import Settings from "./Settings.tsx";
import t, { i18n_map, I18NMap } from "../server/i18n.ts";

export type ContainerProps = {
    i18n: I18NMap;
};

export default class Container extends Component<ContainerProps> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        i18n_map.value = this.props.i18n;
        const [display, set_display] = useState(false);
        const [show_settings, set_show_settings] = useState(false);
        const close_all = () => {
            set_display(false);
            set_show_settings(false);
        };
        return (
            <div>
                <Head>
                    <title>{t("common.title")}</title>
                    <GlobalCtx.Provider value={this.context}>
                        <StyleSheet href="https://fonts.googleapis.com/icon?family=Material+Icons" />
                        <StyleSheet href="preact-material-components/style.css" />
                        <StyleSheet href="common.css" />
                    </GlobalCtx.Provider>
                </Head>
                <TopAppBar onNav={() => set_display(true)}>
                    <TopAppBar.Row>
                        <TopAppBar.Section align-start>
                            <TopAppBar.Icon navigation>menu</TopAppBar.Icon>
                            <TopAppBar.Title>
                                {t("common.title")}
                            </TopAppBar.Title>
                        </TopAppBar.Section>
                        <TopAppBar.Section align-end>
                            <TopAppBar.Icon>more_vert</TopAppBar.Icon>
                        </TopAppBar.Section>
                    </TopAppBar.Row>
                </TopAppBar>
                <List class={"nav-menu" + (display ? " open" : "")}>
                    <List.Item onClick={() => set_display(false)}>
                        <Icon>close</Icon>
                    </List.Item>
                    <List.Item onClick={close_all}>
                        <Icon>home</Icon>
                    </List.Item>
                    <List.Item
                        onClick={() => {
                            close_all();
                            set_show_settings(true);
                        }}
                    >
                        <Icon>settings</Icon>
                    </List.Item>
                </List>
                <div class="main">
                    <Settings show={show_settings} />
                </div>
            </div>
        );
    }
}
