import { Component, ComponentChildren, ContextType } from "preact";
import { BCtx } from "./BContext.tsx";
import { useState } from "preact/hooks";
import type { _MdOutlinedTextField as _TextField } from "../server/md3.ts";
import { MdOutlinedTextField } from "../server/dmodule.ts";
import List from "preact-material-components/List";

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

type Props<T extends keyof TextType> = {
    /**@default {true} */
    clear_cache?: boolean;
    label?: string;
    description?: string;
    value?: TextType[T];
    name?: string;
    type: T;
    disabled?: boolean;
    children?: ComponentChildren;
    set_value?: (v?: TextType[T]) => void;
    min?: DataType[T];
    max?: DataType[T];
    id?: string;
    list?: string;
    datalist?: { value: TextType[T]; label?: string }[];
};

export default class BMd3TextField<T extends keyof TextType>
    extends Component<Props<T>, unknown> {
    static contextType = BCtx;
    declare context: ContextType<typeof BCtx>;
    get clear_cache() {
        return this.props.clear_cache !== undefined
            ? this.props.clear_cache
            : true;
    }
    get_value(e: _TextField): TextType[T] | undefined {
        const type = this.props.type;
        if (!e.value.length) return undefined;
        // @ts-ignore Checked
        if (type === "text" || type === "password") return e.value;
        // @ts-ignore Checked
        return e.valueAsNumber;
    }
    render() {
        if (!MdOutlinedTextField.value) return null;
        let datalist_div = null;
        const [display_datalist, set_display_datalist] = useState(false);
        let cn = "b-text-field md3 text";
        if (this.props.label) cn += " label";
        if (this.props.datalist && this.props.datalist.length) {
            cn += " datalist";
            let cn2 = "datalist";
            if (display_datalist) cn2 += " open";
            const v = this.props.value?.toString();
            datalist_div = (
                <List class={cn2}>
                    {this.props.datalist.map((d) => {
                        if (v !== undefined) {
                            if (!d.value.toString().startsWith(v)) return null;
                        }
                        let label_div = null;
                        if (d.label) {
                            label_div = <div class="label">{d.label}</div>;
                        }
                        return (
                            <List.Item
                                onMousedown={() => {
                                    this.set_value(d.value);
                                }}
                            >
                                <div class="value">{d.value}</div>
                                {label_div}
                            </List.Item>
                        );
                    })}
                </List>
            );
        }
        const TextField = MdOutlinedTextField.value;
        let desc = null;
        if (this.props.description) {
            desc = <label>{this.props.description}</label>;
        }
        let value: string | undefined;
        if (this.props.value !== undefined) {
            if (typeof this.props.value === "string") {
                value = this.props.value;
            } else {
                value = this.props.value.toString();
            }
        } else if (this.clear_cache) {
            value = "";
        }
        return (
            <div class={cn} id={this.props.id}>
                {desc}
                <TextField
                    value={value}
                    type={this.props.type}
                    label={this.props.label}
                    disabled={this.props.disabled}
                    min={this.props.min ? this.props.min.toString() : undefined}
                    max={this.props.max ? this.props.max.toString() : undefined}
                    list={this.props.list}
                    /**@ts-ignore */
                    onInput={(ev: InputEvent) => {
                        if (ev.target) {
                            const e = ev.target as _TextField;
                            this.set_value(this.get_value(e));
                        }
                    }}
                    onFocus={() => set_display_datalist(true)}
                    onBlur={() => set_display_datalist(false)}
                />
                {datalist_div}
                {this.props.children}
            </div>
        );
    }
    set_value(value?: TextType[T]) {
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
