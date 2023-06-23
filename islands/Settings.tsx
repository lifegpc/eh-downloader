import { Component, ContextType } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import Button from "preact-material-components/Button";
import Dialog from "preact-material-components/Dialog";
import Snackbar from "preact-material-components/Snackbar";
import { tw } from "twind";
import { GlobalCtx } from "../components/GlobalContext.tsx";
import { ConfigType, ThumbnailMethod } from "../config.ts";
import SettingsCheckbox from "../components/SettingsCheckbox.tsx";
import SettingsContext from "../components/SettingsContext.tsx";
import SettingsText from "../components/SettingsText.tsx";
import t from "../server/i18n.ts";
import SettingsSelect from "../components/SettingsSelect.tsx";

export type SettingsProps = {
    show: boolean;
};

export default class Settings extends Component<SettingsProps> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        if (!this.props.show) return;
        const [settings, set_settings] = useState<ConfigType | undefined>();
        const [error, set_error] = useState<string | undefined>();
        const [changed, set_changed] = useState<Set<string>>(new Set());
        const [new_cookies, set_new_cookies] = useState<string>("");
        const [disabled, set_disabled] = useState(false);
        const fetchSettings = async () => {
            const re = await fetch("/api/config");
            set_settings(await re.json());
            set_changed(new Set());
            set_new_cookies("");
        };
        const saveSettings = async () => {
            if (!settings) return;
            const s: Record<string, unknown> = settings;
            const d: Record<string, unknown> = {};
            for (const i of changed) {
                if (i === "cookies") d[i] = new_cookies;
                else d[i] = s[i];
            }
            const re = await fetch("/api/config", {
                method: "POST",
                body: JSON.stringify(d),
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const r = await re.json();
            set_changed(new Set());
            set_new_cookies("");
            return r;
        };
        const loadData = () => {
            fetchSettings().catch((e) => {
                set_error(t("settings.failed"));
                console.error(e);
            });
        };
        useEffect(loadData, []);
        const snack = useRef<Snackbar>();
        const show_snack = (message: string) => {
            snack.current?.MDComponent?.show({ message });
        };
        let data;
        if (error) {
            show_snack(error);
            data = <div class={tw`text-red-500`}>{error}</div>;
        } else if (settings) {
            const ref = useRef<SettingsText<"text">>();
            const dlg = useRef<Dialog>();
            const showDlg = () => {
                if (!changed.size) {
                    show_snack(t("settings.no_changed"));
                    return;
                }
                dlg.current?.MDComponent?.show();
            };
            const save = () => {
                set_disabled(true);
                saveSettings().then((d) => {
                    set_disabled(false);
                    show_snack(
                        t("settings.saved") +
                            (d.is_unsafe ? t("settings.need_restart") : ""),
                    );
                    loadData();
                }).catch((e) => {
                    set_disabled(false);
                    show_snack(t("settings.failed"));
                    console.error(e);
                });
            };
            data = (
                <div class="settings">
                    <SettingsContext
                        set_changed={set_changed}
                        set_settings={set_settings}
                    >
                        <SettingsCheckbox
                            name="download_original_img"
                            checked={settings.download_original_img}
                            description={t("settings.download_original_img")}
                        />
                        <SettingsCheckbox
                            name="ex"
                            checked={settings.ex}
                            description={t("settings.ex")}
                        />
                        <SettingsCheckbox
                            name="mpv"
                            checked={settings.mpv}
                            description={t("settings.mpv")}
                        />
                        <SettingsCheckbox
                            name="export_zip_jpn_title"
                            checked={settings.export_zip_jpn_title}
                            description={t("settings.export_zip_jpn_title")}
                        />
                        <SettingsText
                            name="base"
                            value={settings.base}
                            description={t("settings.base")}
                            type="text"
                            outlined={true}
                        />
                        <SettingsText
                            name="ua"
                            value={settings.ua ? settings.ua : ""}
                            description={t("settings.ua")}
                            type="text"
                            outlined={true}
                            ref={ref}
                        >
                            <Button
                                onClick={() => {
                                    if (ref.current) {
                                        const ua = navigator.userAgent;
                                        const t = ref.current;
                                        t.update(ua);
                                        t.set_value(ua);
                                    }
                                }}
                            >
                                {t("settings.ua_now")}
                            </Button>
                        </SettingsText>
                        <SettingsText
                            name="cookies"
                            value={new_cookies}
                            description={t("settings.cookies")}
                            type="text"
                            set_value={set_new_cookies}
                            label={t(
                                `settings.enter${
                                    settings.cookies ? "_new" : ""
                                }_cookies`,
                            )}
                            outlined={true}
                        />
                        <SettingsText
                            name="max_task_count"
                            value={settings.max_task_count}
                            description={t("settings.max_task_count")}
                            type="number"
                            min={1}
                            outlined={true}
                        />
                        <SettingsText
                            name="max_retry_count"
                            value={settings.max_retry_count}
                            description={t("settings.max_retry_count")}
                            type="number"
                            min={1}
                            outlined={true}
                        />
                        <SettingsText
                            name="max_download_img_count"
                            value={settings.max_download_img_count}
                            description={t("settings.max_download_img_count")}
                            type="number"
                            min={1}
                            outlined={true}
                        />
                        <SettingsText
                            name="db_path"
                            value={settings.db_path || ""}
                            type="text"
                            description={t("settings.db_path")}
                            helpertext={t("settings.db_path_help")}
                            outlined={true}
                        />
                        <SettingsText
                            name="port"
                            value={settings.port}
                            description={t("settings.port")}
                            type="number"
                            min={0}
                            max={65535}
                            outlined={true}
                        />
                        <SettingsText
                            name="hostname"
                            value={settings.hostname}
                            description={t("settings.hostname")}
                            type="text"
                            outlined={true}
                        />
                        <SettingsText
                            name="meili_host"
                            value={settings.meili_host || ""}
                            description={t("settings.meili_host")}
                            type="text"
                            outlined={true}
                        />
                        <SettingsText
                            name="meili_update_api_key"
                            value={settings.meili_update_api_key || ""}
                            description={t("settings.meili_update_api_key")}
                            type="text"
                            outlined={true}
                        />
                        <SettingsText
                            name="meili_search_api_key"
                            value={settings.meili_search_api_key || ""}
                            description={t("settings.meili_search_api_key")}
                            type="text"
                            outlined={true}
                        />
                        <SettingsText
                            name="ffmpeg_path"
                            value={settings.ffmpeg_path}
                            description={t("settings.ffmpeg_path")}
                            type="text"
                            outlined={true}
                        />
                        <SettingsSelect
                            name="thumbnail_method"
                            list={[{
                                value: ThumbnailMethod.FFMPEG_BINARY,
                                text: t("settings.thumbnail_method0"),
                            }, {
                                value: ThumbnailMethod.FFMPEG_API,
                                text: t("settings.thumbnail_method1"),
                            }]}
                            description={t("settings.thumbnail_method")}
                            selectedIndex={settings.thumbnail_method}
                            outlined={true}
                        />
                    </SettingsContext>
                    <Button onClick={loadData}>{t("common.reload")}</Button>
                    <Button onClick={showDlg} disabled={disabled}>
                        {t("common.save")}
                    </Button>
                    <Dialog ref={dlg} onAccept={save}>
                        <Dialog.Header>{t("settings.save_dlg")}</Dialog.Header>
                        <Dialog.Footer>
                            <Dialog.FooterButton accept={true}>
                                {t("common.yes")}
                            </Dialog.FooterButton>
                            <Dialog.FooterButton cancel={true}>
                                {t("common.no")}
                            </Dialog.FooterButton>
                        </Dialog.Footer>
                    </Dialog>
                </div>
            );
        } else {
            data = <div class={tw`text-red-500`}>{t("common.loading")}</div>;
        }
        return (
            <div>
                {data}
                <Snackbar ref={snack} />
            </div>
        );
    }
}
