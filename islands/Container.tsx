import { Head } from "$fresh/runtime.ts";
import { Component, ContextType } from "preact";
import { StateUpdater, useEffect, useState } from "preact/hooks";
import Icon from "preact-material-components/Icon";
import List from "preact-material-components/List";
import TopAppBar from "preact-material-components/TopAppBar";
import StyleSheet from "../components/StyleSheet.tsx";
import { GlobalCtx } from "../components/GlobalContext.tsx";
import Settings from "./Settings.tsx";
import t, { i18n_map, I18NMap } from "../server/i18n.ts";
import TaskManager from "./TaskManager.tsx";
import { initState, set_state } from "../server/state.ts";
import NewTask from "../components/NewTask.tsx";
import { parse_int } from "../server/parse.ts";
import { detect_darkmode } from "../server/dark.ts";
import { registeServiceWorker } from "../server/sw.ts";
import { initCfg } from "../server/cfg.ts";

export type ContainerProps = {
    i18n: I18NMap;
};

enum DarkMode {
    Auto,
    Light,
    Dark,
}

function darkmode_next(d: DarkMode) {
    if (d === DarkMode.Auto) return DarkMode.Light;
    if (d === DarkMode.Dark) return DarkMode.Auto;
    return DarkMode.Dark;
}

export default class Container extends Component<ContainerProps> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        i18n_map.value = this.props.i18n;
        const [display, set_display] = useState(false);
        const [state, set_state1] = useState("#/");
        const [darkmode, set_darkmode1] = useState(DarkMode.Auto);
        const [scrollHide, set_ScrollHide] = useState(false);
        const set_darkmode: StateUpdater<DarkMode> = (u) => {
            const v = typeof u === "function" ? u(darkmode) : u;
            set_darkmode1(v);
            localStorage.setItem("darkmode", JSON.stringify(v));
            if (v === DarkMode.Auto) {
                if (detect_darkmode()) {
                    document.body.classList.add("dark-scheme");
                } else {
                    document.body.classList.remove("dark-scheme");
                }
            } else if (v === DarkMode.Dark) {
                document.body.classList.add("dark-scheme");
            } else {
                document.body.classList.remove("dark-scheme");
            }
        };
        useEffect(() => {
            initState(set_state1);
            const dm = parse_int(
                localStorage.getItem("darkmode"),
                DarkMode.Auto,
            );
            set_darkmode1(dm);
            if (dm === DarkMode.Auto) {
                if (detect_darkmode()) {
                    document.body.classList.add("dark-scheme");
                }
            } else if (dm === DarkMode.Dark) {
                document.body.classList.add("dark-scheme");
            }
            registeServiceWorker("/sw.js", { updateViaCache: "all" }).catch(
                (e) => {
                    console.error("Failed to registe service worker.");
                    console.error(e);
                },
            );
            initCfg();
        }, []);
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
                            <TopAppBar.Icon
                                onClick={() => {
                                    set_darkmode(darkmode_next(darkmode));
                                }}
                                navigation
                            >
                                {darkmode === DarkMode.Auto
                                    ? "brightness_auto"
                                    : darkmode === DarkMode.Dark
                                    ? "dark_mode"
                                    : "light_mode"}
                            </TopAppBar.Icon>
                            <TopAppBar.Icon>more_vert</TopAppBar.Icon>
                        </TopAppBar.Section>
                    </TopAppBar.Row>
                </TopAppBar>
                <List class={"nav-menu" + (display ? " open" : "")}>
                    <List.Item onClick={() => set_display(false)}>
                        <Icon>close</Icon>
                    </List.Item>
                    <List.Item
                        onClick={() => {
                            set_display(false);
                            set_state("#/");
                        }}
                    >
                        <Icon>home</Icon>
                    </List.Item>
                    <List.Item
                        onClick={() => {
                            set_display(false);
                            set_state("#/task_manager");
                        }}
                    >
                        <Icon>task</Icon>
                    </List.Item>
                    <List.Item
                        onClick={() => {
                            set_display(false);
                            set_state("#/settings");
                        }}
                    >
                        <Icon>settings</Icon>
                    </List.Item>
                </List>
                <div class="main">
                    <Settings show={state === "#/settings"} />
                    <TaskManager
                        base="#/task_manager"
                        show={state === "#/task_manager"}
                    />
                    <NewTask show={state === "#/task_manager/new"} />
                </div>
            </div>
        );
    }
}
