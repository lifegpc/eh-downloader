import { Component, ContextType } from "preact";
import { SettingsCtx } from "./SettingsContext.tsx";
import { ConfigType } from "../config.ts";
import Select from "preact-material-components/Select";
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
    /**@default {false}*/
    box?: boolean;
    /**@default {false}*/
    outlined?: boolean;
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
    ref: Ref<Select | undefined> | undefined;
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
        this.update(selectedIndex);
    }
    componentDidMount(): void {
        this.update(this.state.selectedIndex);
    }
    render() {
        this.ref = useRef<Select>();
        const id = `s-${this.props.name}`;
        return (
            <div class="s-select" id={id}>
                <label>{this.props.description}</label>
                <Select
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
                        return (
                            <Select.Item disabled={v.disabled}>{t}</Select.Item>
                        );
                    })}
                </Select>
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
}
