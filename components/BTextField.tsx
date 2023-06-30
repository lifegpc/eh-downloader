import { Component, ComponentChildren, ContextType } from "preact";
import TextField from "preact-material-components/TextField";
import { Ref, useRef, useState } from "preact/hooks";
import { BCtx } from "./BContext.tsx";
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
    value?: TextType[T];
    name?: string;
    description?: string;
    type: T;
    label?: string;
    helpertext?: string;
    textarea?: boolean;
    fullwidth?: boolean;
    disabled?: boolean;
    children?: ComponentChildren;
    set_value?: (v?: TextType[T]) => void;
    min?: DataType[T];
    max?: DataType[T];
    outlined?: boolean;
    id?: string;
    list?: string;
    datalist?: { value: TextType[T]; label?: string }[];
};

export default class BTextField<T extends keyof TextType>
    extends Component<Props<T>, unknown> {
    static contextType = BCtx;
    ref: Ref<TextField | undefined> | undefined;
    declare context: ContextType<typeof BCtx>;
    clear() {
        const e = this.ref?.current;
        if (e) {
            const b = e.base;
            if (b) {
                const t = b as HTMLElement;
                const d = t.querySelector("input");
                if (d) {
                    d.value = "";
                }
            }
        }
    }
    get clear_cache() {
        return this.props.clear_cache !== undefined
            ? this.props.clear_cache
            : true;
    }
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
    componentDidMount() {
        if (this.props.value !== undefined) this.update(this.props.value);
        else if (this.clear_cache) this.clear();
    }
    componentDidUpdate(
        previousProps: Readonly<Props<T>>,
        previousState: Readonly<unknown>,
        snapshot: unknown,
    ): void {
        if (this.props.value !== undefined) this.update(this.props.value);
        else if (this.clear_cache) this.clear();
    }
    get value(): TextType[T] | undefined {
        const e = this.ref?.current;
        if (e) {
            const b = e.base;
            if (b) {
                const t = b as HTMLElement;
                const d = t.querySelector("input");
                if (d) {
                    return this.get_value(d);
                }
            }
        }
        return undefined;
    }
    get_value(e: HTMLInputElement): TextType[T] | undefined {
        const type = this.props.type;
        if (!e.value.length) return undefined;
        // @ts-ignore Checked
        if (type === "text" || type === "password") return e.value;
        // @ts-ignore Checked
        return e.valueAsNumber;
    }
    render() {
        this.ref = useRef<TextField>();
        let cn = "b-text-field text";
        let datalist_div = null;
        const [display_datalist, set_display_datalist] = useState(false);
        if (this.props.helpertext) cn += " helper";
        if (this.props.outlined) cn += " outlined";
        if (this.props.label) cn += " label";
        if (this.props.datalist && this.props.datalist.length) {
            cn += " datalist";
            let cn2 = "datalist";
            if (display_datalist) cn2 += " open";
            const v = this.value?.toString();
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
        let desc = null;
        if (this.props.description) {
            desc = <label>{this.props.description}</label>;
        }
        return (
            <div class={cn} id={this.props.id}>
                {desc}
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
                    list={this.props.list}
                    onFocus={() => set_display_datalist(true)}
                    onBlur={() => set_display_datalist(false)}
                />
                {datalist_div}
                {this.props.children}
            </div>
        );
    }
}
