import { Component, ComponentChildren, ContextType } from "preact";
import TextField from "preact-material-components/TextField";
import { Ref, StateUpdater, useRef } from "preact/hooks";
import { BCtx } from "./BContext.tsx";

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
    set_value?: (v: TextType[T]) => void;
    min?: DataType[T];
    max?: DataType[T];
    outlined?: boolean;
    id?: string;
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
    set_value(value: TextType[T]) {
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
    get_value(e: HTMLInputElement): TextType[T] {
        const type = this.props.type;
        // @ts-ignore Checked
        if (type === "text" || type === "password") return e.value;
        // @ts-ignore Checked
        return e.valueAsNumber;
    }
    render() {
        this.ref = useRef<TextField>();
        let cn = "text";
        if (this.props.helpertext) cn += " helper";
        if (this.props.outlined) cn += " outlined";
        if (this.props.label) cn += " label";
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
                />
                {this.props.children}
            </div>
        );
    }
}
