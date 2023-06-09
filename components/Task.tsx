import { Component } from "preact";
import { TaskDetail, TaskStatus } from "../task.ts";

type Props = {
    task: TaskDetail;
};

export default class Task extends Component<Props> {
    render() {
        const task = this.props.task;
        return (
            <div data-id={task.base.id}>
                Task Id: {task.base.id}
            </div>
        );
    }
}
