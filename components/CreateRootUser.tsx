import { Component, ContextType } from "preact";
import { GlobalCtx } from "./GlobalContext.tsx";
import { MdOutlinedTextField } from "../server/dmodule.ts";

type Props = {
    show: boolean;
};

export default class CreateRootUser extends Component<Props> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        if (!MdOutlinedTextField.value) return null;
        if (!this.props.show) return null;
        const OutlinedTextField = MdOutlinedTextField.value;
        return (
            <div>
                <OutlinedTextField />
            </div>
        );
    }
}
