import { Component, ContextType } from "preact";
import { GlobalCtx } from "./GlobalContext.tsx";
import BMd3TextField from "./BMd3TextField.tsx";
import t from "../server/i18n.ts";
import { useState } from "preact/hooks";

type Props = {
    show: boolean;
};

export default class CreateRootUser extends Component<Props> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        if (!this.props.show) return null;
        const [username, set_username] = useState<string>();
        console.log(username);
        return (
            <div>
                <BMd3TextField
                    label={t("user.username")}
                    type="text"
                    value={username}
                    set_value={set_username}
                />
            </div>
        );
    }
}
