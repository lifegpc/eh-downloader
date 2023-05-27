import { Component, ContextType } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import Button from "preact-material-components/Button";
import Dialog from "preact-material-components/Dialog";
import Snackbar from "preact-material-components/Snackbar";
import { tw } from "twind";
import { GlobalCtx } from "../components/GlobalContext.tsx";
import { ConfigType } from "../config.ts";
import SettingsCheckbox from "../components/SettingsCheckbox.tsx";
import SettingsContext from "../components/SettingsContext.tsx";
import SettingsText from "../components/SettingsText.tsx";

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
                set_error("Failed to fetch settings.");
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
                    show_snack("Nothing was changed.");
                    return;
                }
                dlg.current?.MDComponent?.show();
            };
            const save = () => {
                set_disabled(true);
                saveSettings().then((d) => {
                    set_disabled(false);
                    show_snack(
                        "Saved." +
                            (d.is_unsafe
                                ? " Some settings require a restart to take effect."
                                : ""),
                    );
                }).catch((e) => {
                    set_disabled(false);
                    show_snack("Failed to save settings.");
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
                            description="Download original images."
                        />
                        <SettingsCheckbox
                            name="ex"
                            checked={settings.ex}
                            description="Use exhentai.org."
                        />
                        <SettingsCheckbox
                            name="mpv"
                            checked={settings.mpv}
                            description="Fetch page data from Multi-Page Viewer."
                        />
                        <SettingsText
                            name="base"
                            value={settings.base}
                            description="Download location:"
                            type="text"
                        />
                        <SettingsText
                            name="ua"
                            value={settings.ua ? settings.ua : ""}
                            description="User Agent:"
                            type="text"
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
                                Use current browser's user agent.
                            </Button>
                        </SettingsText>
                        <SettingsText
                            name="cookies"
                            value={new_cookies}
                            description="Cookies:"
                            type="text"
                            set_value={set_new_cookies}
                            label={`Enter${
                                settings.cookies ? " new" : ""
                            } cookies here.`}
                        />
                        <SettingsText
                            name="max_task_count"
                            value={settings.max_task_count}
                            description="Maximum number of parallel tasks:"
                            type="number"
                            min={1}
                        />
                        <SettingsText
                            name="max_retry_count"
                            value={settings.max_retry_count}
                            description="Maximum retry count:"
                            type="number"
                            min={1}
                        />
                        <SettingsText
                            name="max_download_img_count"
                            value={settings.max_download_img_count}
                            description="Maximum number of parallel downloads of images:"
                            type="number"
                            min={1}
                        />
                    </SettingsContext>
                    <Button onClick={loadData}>Reload</Button>
                    <Button onClick={showDlg} disabled={disabled}>Save</Button>
                    <Dialog ref={dlg} onAccept={save}>
                        <Dialog.Header>
                            Do you want to save settings?
                        </Dialog.Header>
                        <Dialog.Footer>
                            <Dialog.FooterButton accept={true}>
                                Yes
                            </Dialog.FooterButton>
                            <Dialog.FooterButton cancel={true}>
                                No
                            </Dialog.FooterButton>
                        </Dialog.Footer>
                    </Dialog>
                </div>
            );
        } else {
            data = <div class={tw`text-red-500`}>Loading...</div>;
        }
        return (
            <div>
                {data}
                <Snackbar ref={snack} />
            </div>
        );
    }
}
