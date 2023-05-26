import { Component, ComponentChildren, ContextType } from "preact";
import { SettingsCtx } from "./SettingsContext.tsx";
import { ConfigType } from "../config.ts";
import TextField from "preact-material-components/TextField";
import { Ref, useRef } from "preact/hooks";

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
    set_text(value: string) {
        if (this.context) {
            this.context.set_settings((v) => {
                if (v) {
                    const t: Record<string, unknown> = v;
                    t[this.props.name] = value;
                    if (this.context) {
                        this.context.set_changed((v) => {
                            v.add(this.props.name);
                            return v;
                        });
                    }
                    return t as ConfigType;
                }
            });
        }
    }
    componentDidMount() {
        this.update(this.props.value);
    }
    componentWillUpdate(
        nextProps: Readonly<SettingsTextProps>,
        _nextState: Readonly<unknown>,
        _nextContext: unknown,
    ) {
        this.update(nextProps.value);
    }
    render() {
        this.ref = useRef<TextField>();
        return (
            <div class="text">
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
