import { Component, ComponentChild, createContext } from "preact";
import { StateUpdater } from "preact/hooks";

type State = {
    set_value: StateUpdater<Record<string, unknown>>;
};

type Props = {
    children: ComponentChild;
    set_value: StateUpdater<Record<string, unknown>>;
};

export const BCtx = createContext<State | null>(null);

export default class BContext extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            set_value: props.set_value,
        };
    }
    render() {
        return (
            <BCtx.Provider value={this.state}>
                {this.props.children}
            </BCtx.Provider>
        );
    }
}
