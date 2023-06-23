import { Component, ComponentChildren, ContextType } from "preact";
import { SettingsCtx } from "./SettingsContext.tsx";
import { ConfigType } from "../config.ts";
import TextField from "preact-material-components/TextField";
import { Ref, StateUpdater, useRef } from "preact/hooks";

interface TextType {
    text: string;
    password: string;
    number: number;
}

interface DataType {
    text: never;
    password: never;
    number: number;
}

export type SettingsTextProps<T extends keyof TextType> = {
    value: TextType[T];
    name: keyof ConfigType;
    description: string;
    type: T;
    label?: string;
    helpertext?: string;
    textarea?: boolean;
    fullwidth?: boolean;
    disabled?: boolean;
    children?: ComponentChildren;
    set_value?: StateUpdater<TextType[T]>;
    min?: DataType[T];
    max?: DataType[T];
    outlined?: boolean;
};

export default class SettingsText<T extends keyof TextType>
    extends Component<SettingsTextProps<T>, unknown> {
    static contextType = SettingsCtx;
    ref: Ref<TextField | undefined> | undefined;
    declare context: ContextType<typeof SettingsCtx>;
    update(value: TextType[T]) {
        const e = this.ref?.current;
        if (e) {
            const b = e.base;
            if (b) {
                const t = b as HTMLElement;
                const d = t.querySelector("input");
                if (d) {
                    const type = this.props.type;
                    // @ts-ignore Checked
                    if (type === "text" || type === "password") d.value = value;
                    // @ts-ignore Checked
                    else d.valueAsNumber = value;
                }
            }
        }
    }
    set_changed() {
        if (this.context) {
            this.context.set_changed((v) => {
                v.add(this.props.name);
                return v;
            });
        }
    }
    set_value(value: TextType[T]) {
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
    componentDidMount() {
        this.update(this.props.value);
    }
    componentWillUpdate(
        nextProps: Readonly<SettingsTextProps<T>>,
        _nextState: Readonly<unknown>,
        _nextContext: unknown,
    ) {
        this.update(nextProps.value);
    }
    get_value(e: HTMLInputElement): TextType[T] {
        const type = this.props.type;
        // @ts-ignore Checked
        if (type === "text" || type === "password") return e.value;
        // @ts-ignore Checked
        return e.valueAsNumber;
    }
    render() {
        this.ref = useRef<TextField>();
        const id = `s-${this.props.name}`;
        let cn = "text";
        if (this.props.helpertext) cn += " helper";
        if (this.props.outlined) cn += " outlined";
        return (
            <div class={cn} id={id}>
                <label>{this.props.description}</label>
                <TextField
                    fullwidth={this.props.fullwidth}
                    textarea={this.props.textarea}
                    type={this.props.type}
                    disabled={this.props.disabled}
                    helperText={this.props.helpertext}
                    label={this.props.label}
                    ref={this.ref}
                    onInput={(ev: InputEvent) => {
                        if (ev.target) {
                            const e = ev.target as HTMLInputElement;
                            this.set_value(this.get_value(e));
                        }
                    }}
                    min={this.props.min}
                    max={this.props.max}
                    outlined={this.props.outlined}
                />
                {this.props.children}
            </div>
        );
    }
}
