import { Component, ContextType } from "preact";
import Md3Select from "./Md3Select.tsx";
import { StateUpdater } from "preact/hooks";
import { BCtx } from "./BContext.tsx";

interface obj {
    toString(): string;
}

type Props<T extends obj> = {
    id?: string;
    list: { value: T; text?: string; disabled?: boolean }[];
    /**@default {0}*/
    selectedIndex?: number;
    selectedValue?: T;
    /**@default {false}*/
    disabled?: boolean;
    hintText?: string;
    set_value?: StateUpdater<T>;
    name?: string;
};

type State = {
    selectedIndex: number;
};

export default class BSelect<T extends obj> extends Component<Props<T>, State> {
    static contextType = BCtx;
    declare context: ContextType<typeof BCtx>;
    constructor(props: Props<T>) {
        super(props);
        if (!props.list.length) throw Error("No list.");
        let index = props.selectedValue
            ? props.list.findIndex((v) => v.value === props.selectedValue)
            : props.selectedIndex;
        if (index === -1) index = 0;
        this.state = { selectedIndex: index || 0 };
    }
    componentWillReceiveProps(
        nextProps: Readonly<Props<T>>,
        _nextContext: unknown,
    ): void {
        const index = nextProps.selectedValue
            ? nextProps.list.findIndex((v) =>
                v.value === nextProps.selectedValue
            )
            : nextProps.selectedIndex;
        if (index === -1) return;
        const selectedIndex = index || 0;
        this.setState({ selectedIndex });
    }
    render() {
        return (
            <Md3Select
                id={this.props.id}
                supportingText={this.props.hintText}
                disabled={this.props.disabled}
                set_index={(selectedIndex) => {
                    this.setState({ selectedIndex });
                    this.set_value(selectedIndex);
                }}
                selectedIndex={this.state.selectedIndex}
            >
                {this.props.list.map((v) => {
                    const t = v.text ? v.text : v.value.toString();
                    return <Md3Select.Option disabled={v.disabled} value={t} />;
                })}
            </Md3Select>
        );
    }
    get selectedIndex() {
        return this.state.selectedIndex;
    }
    set_value(index: number) {
        const value = this.props.list[index].value;
        if (this.props.set_value) {
            this.props.set_value(value);
        } else if (this.context) {
            this.context.set_value((v) => {
                v[this.props.name || ""] = value;
                return v;
            });
        }
    }
}
