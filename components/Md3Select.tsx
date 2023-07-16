import { Component, VNode } from "preact";
import { MdOutlinedSelect, MdSelectOption } from "../server/dmodule.ts";
import type { _MdOutlinedSelect } from "../server/md3.ts";

type OProps = {
    value: string;
    headline?: string;
    selected?: boolean;
    disabled?: boolean;
};

class Md3Option extends Component<OProps> {
    render() {
        if (!MdSelectOption.value) return null;
        const Option = MdSelectOption.value;
        return (
            <Option
                value={this.props.value}
                headline={this.props.headline || this.props.value}
                selected={this.props.selected}
                disabled={this.props.disabled}
            />
        );
    }
}

type Props = {
    id?: string;
    children: VNode<Md3Option>[] | VNode<Md3Option>;
    /**@default {false} */
    quick?: boolean;
    /**@default {false} */
    required?: boolean;
    /**@default {false} */
    disabled?: boolean;
    errorText?: string;
    label?: string;
    supportingText?: string;
    /**@default {false} */
    error?: boolean;
    menuFixed?: boolean;
    typeaheadDelay?: number;
    hasLeadingIcon?: boolean;
    hasTrailingIcon?: boolean;
    displayText?: string;
    selectedIndex?: number;
    set_index?: (index: number) => void;
};

type State = {
    selectedIndex: number;
};

export default class Md3Select extends Component<Props, State> {
    static readonly Option = Md3Option;
    constructor(props: Props) {
        super(props);
        this.state = { selectedIndex: props.selectedIndex || 0 };
    }
    componentWillReceiveProps(
        nextProps: Readonly<Props>,
        _nextContext: unknown,
    ): void {
        const selectedIndex = nextProps.selectedIndex || 0;
        this.setState({ selectedIndex });
    }
    get selectedIndex() {
        return this.state.selectedIndex;
    }
    render() {
        if (!MdOutlinedSelect.value) return null;
        const Select = MdOutlinedSelect.value;
        return (
            <Select
                id={this.props.id}
                quick={this.props.quick}
                required={this.props.required}
                disabled={this.props.disabled}
                errorText={this.props.errorText}
                label={this.props.label}
                supportingText={this.props.supportingText}
                error={this.props.error}
                menuFixed={this.props.menuFixed}
                typeaheadDelay={this.props.typeaheadDelay}
                hasLeadingIcon={this.props.hasLeadingIcon}
                hasTrailingIcon={this.props.hasTrailingIcon}
                displayText={this.props.displayText}
                selectedIndex={this.state.selectedIndex}
                onChange={(e) => {
                    const t = e.target as _MdOutlinedSelect;
                    this.setState({ selectedIndex: t.selectedIndex });
                    if (this.props.set_index) {
                        this.props.set_index(t.selectedIndex);
                    }
                }}
            >
                {/**@ts-ignore */}
                {this.props.children}
            </Select>
        );
    }
}
