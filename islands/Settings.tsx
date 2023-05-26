import { Component, ContextType } from "preact";
import { useEffect, useState } from "preact/hooks";
import Button from "preact-material-components/Button";
import { tw } from "twind";
import { GlobalCtx } from "../components/GlobalContext.tsx";
import { ConfigType } from "../config.ts";
import SettingsCheckbox from "../components/SettingsCheckbox.tsx";
import SettingsContext from "../components/SettingsContext.tsx";

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
        const fetchSettings = async () => {
            const re = await fetch("/api/config");
            set_settings(await re.json());
            set_changed(new Set());
        };
        const loadData = () => {
            fetchSettings().catch((e) => {
                set_error("Failed to fetch settings.");
                console.error(e);
            });
        };
        useEffect(loadData, []);
        let data;
        if (error) {
            data = <div class={tw`text-red-500`}>{error}</div>;
        } else if (settings) {
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
                    </SettingsContext>
                    <Button onClick={loadData}>Reload</Button>
                </div>
            );
        } else {
            data = <div>Loading...</div>;
        }
        return <div>{data}</div>;
    }
}
