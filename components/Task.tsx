import { Component } from "preact";
import Icon from "preact-material-components/Icon";
import type { TaskDetail } from "../task.ts";
import t from "../server/i18n.ts";

type Props = {
    task: TaskDetail;
};

type State = {
    task_changed: (d: Event) => void;
};

export default class Task extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            task_changed: (e) => this.task_changed(e),
        };
    }
    task_changed(d: Event) {
        const e = d as unknown as CustomEvent<number>;
        if (e.detail == this.props.task.base.id) {
            e.stopImmediatePropagation();
            this.forceUpdate();
        }
    }
    render() {
        const task = this.props.task;
        console.log(task);
        return (
            <div data-id={task.base.id}>
                <Icon class="task_handle">unfold_more</Icon>
                {t("task.id")}
                {task.base.id}
            </div>
        );
    }
    componentDidMount(): void {
        self.addEventListener("task_changed", this.state.task_changed);
    }
    componentWillUnmount(): void {
        self.removeEventListener("task_changed", this.state.task_changed);
    }
}
