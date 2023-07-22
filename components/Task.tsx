import { Component } from "preact";
import Icon from "preact-material-components/Icon";
import type { TaskDetail, TaskProgressBasicType } from "../task.ts";
import { TaskStatus, TaskType } from "../task.ts";
import t from "../server/i18n.ts";
import { tw } from "twind";
import Progress from "./Progress.tsx";
import { TaskStatusFlag } from "./TaskFilterBar.tsx";

type Props = {
    task: TaskDetail;
    flags: TaskStatusFlag;
};

type State = {
    task_changed: (d: Event) => void;
};

const Types: Record<TaskType, string> = {
    [TaskType.Download]: "download",
    [TaskType.ExportZip]: "export_zip",
    [TaskType.UpdateMeiliSearchData]: "update_meilisearch_data",
    [TaskType.FixGalleryPage]: "fix_gallery_page",
};

const Status: Record<TaskStatus, string> = {
    [TaskStatus.Wait]: "waiting",
    [TaskStatus.Running]: "running",
    [TaskStatus.Finished]: "finished",
    [TaskStatus.Failed]: "failed",
};

function map_taskstatus(s: TaskStatus) {
    if (s === TaskStatus.Wait) return TaskStatusFlag.Waiting;
    else if (s === TaskStatus.Running) return TaskStatusFlag.Running;
    else if (s === TaskStatus.Finished) return TaskStatusFlag.Finished;
    else if (s === TaskStatus.Failed) return TaskStatusFlag.Failed;
    return TaskStatusFlag.None;
}

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
        if (!(this.props.flags & map_taskstatus(task.status))) {
            return <div data-id={task.base.id}></div>;
        }
        console.log(task);
        let error_div = null;
        if (task.status === TaskStatus.Failed) {
            error_div = (
                <div class="error">
                    {t("task.error_msg")}
                    <div class={tw`text-red-500`}>{task.error}</div>
                </div>
            );
        }
        let progress_div = null;
        if (task.status === TaskStatus.Running && task.progress) {
            if (task.base.type === TaskType.Download) {
                const d = task
                    .progress as TaskProgressBasicType[TaskType.Download];
                const b_progress_div = (
                    <Progress max={d.total_page} animated={true}>
                        <Progress.Bar
                            class="bg-success"
                            value={d.downloaded_page}
                        />
                        <Progress.Bar class="bg-danger" value={d.failed_page} />
                    </Progress>
                );
                progress_div = (
                    <div>
                        {b_progress_div}
                        {d.details.map((v) => {
                            return (
                                <div>
                                    <div>{v.name}</div>
                                    <Progress
                                        max={v.total || v.downloaded}
                                        animated={true}
                                    >
                                        <Progress.Bar
                                            class="bg-success"
                                            value={v.downloaded}
                                        />
                                    </Progress>
                                </div>
                            );
                        })}
                    </div>
                );
            }
        }
        return (
            <div data-id={task.base.id}>
                <Icon class="task_handle">unfold_more</Icon>
                <div>{t("task.id")}{task.base.id}</div>
                <div>{t("task.type")}{t(`task.${Types[task.base.type]}`)}</div>
                <div>{t("task.status")}{t(`task.${Status[task.status]}`)}</div>
                {error_div}
                {progress_div}
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
