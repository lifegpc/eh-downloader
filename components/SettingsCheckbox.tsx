import { Component, ContextType } from "preact";
import { SettingsCtx } from "./SettingsContext.tsx";
import type { ConfigType } from "../config.ts";
import Checkbox from "preact-material-components/Checkbox";

export type SettingsCheckboxProps = {
    checked: boolean;
    name: keyof ConfigType;
    description: string;
};

export default class SettingsCheckbox
    extends Component<SettingsCheckboxProps, unknown> {
    static contextType = SettingsCtx;
    declare context: ContextType<typeof SettingsCtx>;
    render() {
        const id = `s-${this.props.name}`;
        return (
            <div>
                <Checkbox
                    id={id}
                    checked={this.props.checked}
                    onInput={(ev: Event) => {
                        if (ev.target && this.context) {
                            const e = ev.target as HTMLInputElement;
                            this.context.set_settings((v) => {
                                if (v) {
                                    const t: Record<string, unknown> = v;
                                    t[this.props.name] = e.checked;
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
                    }}
                />
                <label for={id}>{this.props.description}</label>
            </div>
        );
    }
}
