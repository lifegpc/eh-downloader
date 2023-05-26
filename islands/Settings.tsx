import { Component, ContextType } from "preact";
import { useEffect, useState } from "preact/hooks";
import Button from "preact-material-components/Button";
import Checkbox from "preact-material-components/Checkbox";
import { tw } from "twind";
import { GlobalCtx } from "../components/GlobalContext.tsx";
import { ConfigType } from "../config.ts";

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
        const fetchSettings = async () => {
            const re = await fetch("/api/config");
            set_settings(await re.json());
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
                    <Checkbox id="s-ex" checked={settings.ex} />
                    <label for="s-ex">Use exhentai.org.</label>
                    <br />
                    <Button onClick={loadData}>Reload</Button>
                </div>
            );
        } else {
            data = <div>Loading...</div>;
        }
        return <div>{data}</div>;
    }
}
