import { Component, ContextType } from "preact";
import { GlobalCtx } from "./GlobalContext.tsx";
import Fab from "preact-material-components/Fab";
import Icon from "preact-material-components/Icon";
import { set_state } from "../server/state.ts";
import t from "../server/i18n.ts";
import BSelect from "./BSelect.tsx";
import { useState } from "preact/hooks";
import { TaskType } from "../task.ts";

export type NewTaskProps = {
    show: boolean;
};

export default class NewTask extends Component<NewTaskProps> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        if (!this.props.show) return null;
        const [task_type, set_task_type] = useState(TaskType.Download);
        let config_div = null;
        if (task_type === TaskType.Download) {
            config_div = (
                <div class="download">
                    {t("task.gallery_url")}
                </div>
            );
        }
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
                    <div class="content">
                        <div class="type">
                            {t("task.type")}
                            <BSelect
                                outlined={true}
                                list={[{
                                    value: TaskType.Download,
                                    text: t("task.download"),
                                }, {
                                    value: TaskType.ExportZip,
                                    text: t("task.export_zip"),
                                }]}
                                selectedValue={task_type}
                                set_value={set_task_type}
                            />
                        </div>
                        {config_div}
                    </div>
                    <div class="bottom"></div>
                </div>
            </div>
        );
    }
}
