import { Component, ContextType } from "preact";
import { GlobalCtx } from "./GlobalContext.tsx";
import BMd3TextField from "./BMd3TextField.tsx";
import t from "../server/i18n.ts";
import { useState } from "preact/hooks";
import { MdTonalButton } from "../server/dmodule.ts";

type Props = {
    show: boolean;
};

export default class CreateRootUser extends Component<Props> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        if (!this.props.show) return null;
        if (!MdTonalButton.value) return null;
        const [username, set_username] = useState<string>();
        const [password, set_password] = useState<string>();
        const Button = MdTonalButton.value;
        return (
            <div>
                <BMd3TextField
                    label={t("user.username")}
                    type="text"
                    value={username}
                    set_value={set_username}
                />
                <BMd3TextField
                    label={t("user.password")}
                    type="password"
                    value={password}
                    set_value={set_password}
                />
                <Button
                    disabled={false}
                    onClick={() => {
                        console.log("Click");
                    }}
                >
                    Login
                </Button>
            </div>
        );
    }
}
