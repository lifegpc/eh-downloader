import { Component, ComponentChildren, ContextType } from "preact";
import { SettingsCtx } from "./SettingsContext.tsx";
import { ConfigType } from "../config.ts";
import TextField from "preact-material-components/TextField";
import { Ref, StateUpdater, useRef } from "preact/hooks";

export type SettingsTextProps = {
    value: string;
    name: keyof ConfigType;
    description: string;
    label?: string;
    helpertext?: string;
    textarea?: boolean;
    fullwidth?: boolean;
    disabled?: boolean;
    children?: ComponentChildren;
    set_value?: StateUpdater<string>;
    ignore_update_value?: boolean;
};

export default class SettingsText
    extends Component<SettingsTextProps, unknown> {
    static contextType = SettingsCtx;
    ref: Ref<TextField | undefined> | undefined;
    declare context: ContextType<typeof SettingsCtx>;
    update(value: string) {
        const e = this.ref?.current;
        if (e) {
            const b = e.base;
            if (b) {
                const t = b as HTMLElement;
                const d = t.querySelector("input");
                if (d) {
                    d.value = value;
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
    set_text(value: string) {
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
        if (!this.props.ignore_update_value) this.update(this.props.value);
    }
    componentWillUpdate(
        nextProps: Readonly<SettingsTextProps>,
        _nextState: Readonly<unknown>,
        _nextContext: unknown,
    ) {
        if (!this.props.ignore_update_value) this.update(nextProps.value);
    }
    render() {
        this.ref = useRef<TextField>();
        const id = `s-${this.props.name}`;
        return (
            <div class="text" id={id}>
                <label>{this.props.description}</label>
                <TextField
                    fullwidth={this.props.fullwidth}
                    textarea={this.props.textarea}
                    type="text"
                    disabled={this.props.disabled}
                    helperText={this.props.helpertext}
                    label={this.props.label}
                    ref={this.ref}
                    onInput={(ev: InputEvent) => {
                        if (ev.target) {
                            const e = ev.target as HTMLInputElement;
                            this.set_text(e.value);
                        }
                    }}
                />
                {this.props.children}
            </div>
        );
    }
}
