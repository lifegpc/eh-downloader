import { Component, ContextType } from "preact";
import Select from "preact-material-components/Select";
import { Ref, StateUpdater, useRef } from "preact/hooks";
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
    /**@default {false}*/
    box?: boolean;
    /**@default {false}*/
    outlined?: boolean;
    hintText?: string;
    set_value?: StateUpdater<T>;
    name?: string;
};

type State = {
    selectedIndex: number;
};

export default class SettingsSelect<T extends obj>
    extends Component<Props<T>, State> {
    static contextType = BCtx;
    declare context: ContextType<typeof BCtx>;
    ref: Ref<Select | undefined> | undefined;
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
        this.update(selectedIndex);
    }
    componentDidMount(): void {
        this.update(this.state.selectedIndex);
    }
    render() {
        this.ref = useRef<Select>();
        return (
            <Select
                id={this.props.id}
                ref={this.ref}
                hintText={this.props.hintText}
                disabled={this.props.disabled}
                box={this.props.box}
                outlined={this.props.outlined}
                onChange={(e: Event) => {
                    if (!e.target) return;
                    /**@ts-ignore */
                    const selectedIndex: number = e.target.selectedIndex;
                    this.setState({ selectedIndex });
                    this.set_value(selectedIndex);
                }}
            >
                {this.props.list.map((v) => {
                    const t = v.text ? v.text : v.value.toString();
                    return <Select.Item disabled={v.disabled}>{t}</Select.Item>;
                })}
            </Select>
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
    update(index: number) {
        const e = this.ref?.current;
        if (e) {
            const b = e.base;
            if (b) {
                const t = b as HTMLElement;
                const s = t.querySelector("select");
                if (s) {
                    s.selectedIndex = index;
                }
            }
        }
    }
    update_value(value: T) {
        const index = this.props.list.findIndex((v) => v.value === value);
        if (index !== -1) this.update(index);
    }
}
