import { Component, ComponentChild, createContext } from "preact";
import { StateUpdater } from "preact/hooks";
import { ConfigType } from "../config.ts";

export const SettingsCtx = createContext<State | null>(null);

type State = {
    set_settings: StateUpdater<ConfigType | undefined>;
    set_changed: StateUpdater<Set<string>>;
};

type Props = {
    children: ComponentChild;
    set_settings: StateUpdater<ConfigType | undefined>;
    set_changed: StateUpdater<Set<string>>;
};

export default class SettingsContext extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            set_settings: props.set_settings,
            set_changed: props.set_changed,
        };
    }
    render() {
        return (
            <SettingsCtx.Provider value={this.state}>
                {this.props.children}
            </SettingsCtx.Provider>
        );
    }
}
