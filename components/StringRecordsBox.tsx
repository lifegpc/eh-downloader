import { Component, ContextType, createContext } from "preact";
import BMd3TextField from "./BMd3TextField.tsx";
import { MdTonalButton } from "../server/dmodule.ts";

type CtxProps = {
    set_value: (index: number, key?: string, value?: string) => void;
    append: () => void;
    delete: (index: number) => void;
    sign: string;
};

const Ctx = createContext<CtxProps | null>(null);

type SRProps = {
    k?: string;
    value?: string;
    index: number;
    disable?: boolean;
};

type SRState = {
    k: string;
    value: string;
};

class StringRecord extends Component<SRProps, SRState> {
    static contextType = Ctx;
    declare context: ContextType<typeof Ctx>;
    constructor(props: SRProps) {
        super(props);
        this.state = { k: props.k || "", value: props.value || "" };
    }
    componentWillReceiveProps(
        nextProps: Readonly<SRProps>,
        nextContext: unknown,
    ): void {
        this.setState({ k: nextProps.k || "", value: nextProps.value || "" });
    }
    render() {
        if (!MdTonalButton.value) return null;
        const Button = MdTonalButton.value;
        return (
            <div class="string-record">
                <BMd3TextField
                    type="text"
                    value={this.state.k}
                    set_value={(k) => {
                        this.context?.set_value(
                            this.props.index,
                            k,
                            this.state.value,
                        );
                        this.setState({ k, value: this.state.value });
                    }}
                />
                {this.context?.sign || "="}
                <BMd3TextField
                    type="text"
                    value={this.state.value}
                    set_value={(v) => {
                        this.context?.set_value(
                            this.props.index,
                            this.state.k,
                            v,
                        );
                        this.setState({ k: this.state.k, value: v });
                    }}
                />
                <Button
                    onClick={() => {
                        this.context?.append();
                    }}
                >
                    +
                </Button>
                <Button
                    onClick={() => {
                        this.context?.delete(this.props.index);
                    }}
                    disabled={this.props.disable}
                >
                    -
                </Button>
            </div>
        );
    }
}

type State = {
    list: SRProps[];
    append: () => void;
    set_value: (index: number, key?: string, value?: string) => void;
    delete: (index: number) => void;
};

type Props = {
    value: Record<string, string>;
    set_value?: (v: Record<string, string>) => void;
    sign?: string;
};

export default class StringRecordsBox extends Component<Props, State> {
    index = 0;
    constructor(props: Props) {
        super(props);
        const keys = Object.getOwnPropertyNames(props.value);
        this.state = {
            list: keys.length
                ? keys.map((k) => {
                    return { k: k, value: props.value[k], index: this.index++ };
                })
                : [{ index: this.index++ }],
            append: () => {
                this.append();
            },
            set_value: (index, key, value) => {
                this.set_value(index, key, value);
            },
            delete: (index) => {
                this.delete(index);
            },
        };
    }
    append() {
        this.state.list.push({ index: this.index++ });
        this.forceUpdate();
    }
    delete(index: number) {
        const i = this.state.list.findIndex((i) => i.index === index);
        if (i === -1) return;
        const d = this.state.list.splice(i, 1)[0];
        if (d.k) {
            delete this.props.value[d.k];
            if (this.props.set_value) this.props.set_value(this.props.value);
        }
        this.forceUpdate();
    }
    set_value(index: number, key?: string, value?: string) {
        const i = this.state.list.findIndex((i) => i.index === index);
        let changed = false;
        let pkey: string | undefined;
        if (i !== -1) {
            pkey = this.state.list[i].k;
            this.state.list[i] = { index, k: key, value };
        }
        console.log(index, i, key, pkey, value);
        if (pkey !== undefined && pkey !== "" && pkey !== key) {
            delete this.props.value[pkey];
            changed = true;
        }
        if (key !== undefined) {
            if (value !== undefined) this.props.value[key] = value;
            else delete this.props.value[key];
            changed = true;
        }
        if (changed && this.props.set_value) {
            this.props.set_value(this.props.value);
        }
    }
    render() {
        return (
            <div class="string-records-box">
                <Ctx.Provider
                    value={{
                        append: this.state.append,
                        set_value: this.state.set_value,
                        delete: this.state.delete,
                        sign: this.props.sign || "=",
                    }}
                >
                    {this.state.list.map((v) => (
                        <StringRecord
                            k={v.k}
                            value={v.value}
                            index={v.index}
                            disable={this.state.list.length == 1}
                        />
                    ))}
                </Ctx.Provider>
            </div>
        );
    }
}
