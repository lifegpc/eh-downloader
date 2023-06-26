import { Component, ContextType } from "preact";
import { GlobalCtx } from "./GlobalContext.tsx";
import Fab from "preact-material-components/Fab";
import Icon from "preact-material-components/Icon";
import { set_state } from "../server/state.ts";
import t from "../server/i18n.ts";

export type NewTaskProps = {
    show: boolean;
};

export default class NewTask extends Component<NewTaskProps> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        if (!this.props.show) return null;
        return (
            <div class="new_task">
                <div class="container">
                    <div class="top">
                        <div class="title">{t("task.add")}</div>
                        <Fab class="close" mini={true}>
                            <Icon
                                onClick={() => {
                                    set_state((p) => p.slice(0, p.length - 4));
                                }}
                            >
                                close
                            </Icon>
                        </Fab>
                    </div>
                    <div class="content"></div>
                    <div class="bottom"></div>
                </div>
            </div>
        );
    }
}
