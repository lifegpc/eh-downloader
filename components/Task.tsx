import { Component } from "preact";
import { TaskDetail, TaskStatus } from "../task.ts";

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
                Task Id: {task.base.id}
            </div>
        );
    }
    componentDidMount(): void {
        self.addEventListener("task_started", this.state.task_changed);
        self.addEventListener("task_finished", this.state.task_changed);
    }
    componentWillUnmount(): void {
        self.removeEventListener("task_started", this.state.task_changed);
        self.removeEventListener("task_finished", this.state.task_changed);
    }
}
