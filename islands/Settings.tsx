import { Component, ContextType } from "preact";
import { GlobalCtx } from "../components/GlobalContext.tsx";

export type SettingsProps = {
    show: boolean;
};

export default class Settings extends Component<SettingsProps> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        if (!this.props.show) return;
        return <div>Settings</div>;
    }
}
