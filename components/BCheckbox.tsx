import { Component, ContextType } from "preact";
import Checkbox from "preact-material-components/Checkbox";
import { BCtx } from "./BContext.tsx";

type Props = {
    id?: string;
    checked: boolean;
    name?: string;
    description?: string;
    set_value?: (v: boolean) => void;
};

export default class BCheckbox extends Component<Props, unknown> {
    static contextType = BCtx;
    declare context: ContextType<typeof BCtx>;
    set_value(value: boolean) {
        if (this.props.set_value) {
            this.props.set_value(value);
        } else if (this.context) {
            this.context.set_value((v) => {
                v[this.props.name || ""] = value;
                return v;
            });
        }
    }
    render() {
        let label = null;
        if (this.props.description) {
            label = <label for={this.props.id}>{this.props.description}</label>;
        }
        return (
            <div class="bcheckbox">
                <Checkbox
                    id={this.props.id}
                    checked={this.props.checked}
                    onInput={(ev: Event) => {
                        if (ev.target) {
                            const e = ev.target as HTMLInputElement;
                            this.set_value(e.checked);
                        }
                    }}
                />
                {label}
            </div>
        );
    }
}
