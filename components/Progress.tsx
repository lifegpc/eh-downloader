import {
    Component,
    ComponentChildren,
    ContextType,
    createContext,
} from "preact";

type CtxProps = {
    min: number;
    max: number;
    striped: boolean;
    animated: boolean;
};

const PCtx = createContext<CtxProps | null>(null);

type BarProps = {
    value: number;
    striped?: boolean;
    animated?: boolean;
    class?: string;
    label?: string;
    set_label?: (
        per: number,
        value: number,
        max: number,
        min: number,
    ) => string;
};

class ProgressBar extends Component<BarProps> {
    static contextType = PCtx;
    declare context: ContextType<typeof PCtx>;
    render() {
        let cls = "progress-bar";
        const striped = this.props.striped === undefined
            ? this.context?.striped
            : this.props.striped;
        const animated = this.props.animated === undefined
            ? this.context?.animated
            : this.props.animated;
        if (striped || animated) cls += " progress-bar-striped";
        if (animated) cls += " progress-bar-animated";
        if (this.props.class) cls += " " + this.props.class;
        const max = this.context?.max || 100;
        const min = this.context?.min || 0;
        const v = this.props.value;
        const per = (v - min) / (max - min) * 100;
        const style = `width: ${per}%;`;
        let label = this.props.label;
        if (this.props.set_label) {
            label = this.props.set_label(per, v, max, min);
        }
        return (
            <div
                class={cls}
                style={style}
                role="progressbar"
                aria-valuenow={v}
                aria-valuemin={min}
                aria-valuemax={max}
            >
                {label}
            </div>
        );
    }
}

type Props = {
    /**@default {0} */
    min?: number;
    /**@default {100} */
    max?: number;
    /**@default {false} */
    striped?: boolean;
    /**@default {false} */
    animated?: boolean;
    children: ComponentChildren;
};

export default class Progress extends Component<Props> {
    static readonly Bar = ProgressBar;
    render() {
        return (
            <div class="progress">
                <PCtx.Provider
                    value={{
                        min: this.props.min || 0,
                        max: this.props.max || 100,
                        striped: this.props.striped || false,
                        animated: this.props.animated || false,
                    }}
                >
                    {this.props.children}
                </PCtx.Provider>
            </div>
        );
    }
}
