import { Component, ComponentChild, createContext } from "preact";

export const GlobalCtx = createContext<State | null>(null);

type State = {
    stylesheets: Set<string>;
};

type Props = { children: ComponentChild };

export default class GlobalContext extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { stylesheets: new Set() };
    }
    render() {
        return (
            <GlobalCtx.Provider value={this.state}>
                {this.props.children}
            </GlobalCtx.Provider>
        );
    }
}
