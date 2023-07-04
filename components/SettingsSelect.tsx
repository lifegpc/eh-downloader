import { Component, ContextType } from "preact";
import { SettingsCtx } from "./SettingsContext.tsx";
import { ConfigType } from "../config.ts";
import Md3Select from "./Md3Select.tsx";
import { Ref, StateUpdater, useRef } from "preact/hooks";

interface obj {
    toString(): string;
}

type Props<T extends obj> = {
    name: keyof ConfigType;
    list: { value: T; text?: string; disabled?: boolean }[];
    description: string;
    /**@default {0}*/
    selectedIndex?: number;
    /**@default {false}*/
    disabled?: boolean;
    hintText?: string;
    set_value?: StateUpdater<T>;
};

type State = {
    selectedIndex: number;
};

export default class SettingsSelect<T extends obj>
    extends Component<Props<T>, State> {
    static contextType = SettingsCtx;
    declare context: ContextType<typeof SettingsCtx>;
    constructor(props: Props<T>) {
        super(props);
        if (!props.list.length) throw Error("No list.");
        this.state = { selectedIndex: props.selectedIndex || 0 };
    }
    componentWillReceiveProps(
        nextProps: Readonly<Props<T>>,
        _nextContext: unknown,
    ): void {
        const selectedIndex = nextProps.selectedIndex || 0;
        this.setState({ selectedIndex });
    }
    render() {
        const id = `s-${this.props.name}`;
        return (
            <div class="s-select" id={id}>
                <label>{this.props.description}</label>
                <Md3Select
                    supportingText={this.props.hintText}
                    disabled={this.props.disabled}
                    selectedIndex={this.state.selectedIndex}
                    set_index={(selectedIndex) => {
                        this.setState({ selectedIndex });
                        this.set_value(selectedIndex);
                    }}
                >
                    {this.props.list.map((v) => {
                        const t = v.text ? v.text : v.value.toString();
                        return (
                            <Md3Select.Option disabled={v.disabled} value={t} />
                        );
                    })}
                </Md3Select>
            </div>
        );
    }
    set_changed() {
        if (this.context) {
            this.context.set_changed((v) => {
                v.add(this.props.name);
                return v;
            });
        }
    }
    set_value(index: number) {
        const value = this.props.list[index].value;
        if (this.props.set_value) {
            this.props.set_value(value);
            this.set_changed();
        } else if (this.context) {
            this.context.set_settings((v) => {
                if (v) {
                    const t: Record<string, unknown> = v;
                    t[this.props.name] = value;
                    this.set_changed();
                    return t as ConfigType;
                }
            });
        }
    }
}
