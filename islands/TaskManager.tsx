import { Component, ContextType } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { signal } from "@preact/signals";
import { GlobalCtx } from "../components/GlobalContext.tsx";
import type { TaskDetail } from "../task.ts";
import { TaskStatus } from "../task.ts";
import { Sortable } from "sortable";
import type {
    TaskClientSocketData,
    TaskServerSocketData,
} from "../server/task.ts";
import { get_ws_host } from "../server/utils.ts";
import Task from "../components/Task.tsx";
import Fab from "preact-material-components/Fab";
import Icon from "preact-material-components/Icon";
import { set_state } from "../server/state.ts";
import t from "../server/i18n.ts";
import { TaskFilterBar, TaskStatusFlag } from "../components/TaskFilterBar.tsx";

export type TaskManagerProps = {
    base: string;
    show: boolean;
};

function map_taskstatus(s: TaskStatus) {
    if (s === TaskStatus.Wait) return TaskStatusFlag.Waiting;
    else if (s === TaskStatus.Running) return TaskStatusFlag.Running;
    else if (s === TaskStatus.Finished) return TaskStatusFlag.Finished;
    return TaskStatusFlag.None;
}

const tasks = signal(new Map<number, TaskDetail>());
const task_list = signal(new Array<number>());
export const task_ws = signal<WebSocket | undefined>(undefined);
export function sendTaskMessage(mes: TaskClientSocketData) {
    const ws = task_ws.value;
    if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(mes));
        return true;
    } else return false;
}

type SortableEvent = CustomEvent & {
    oldIndex: number | undefined;
    newIndex: number | undefined;
};

export default class TaskManager extends Component<TaskManagerProps> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    sortable?: Sortable;
    render() {
        const ul = useRef<HTMLDivElement>();
        useEffect(() => {
            if (!this.props.show) {
                this.sortable?.destroy();
                this.sortable = undefined;
                return;
            }
            this.sortable = new Sortable(ul.current, {
                handle: ".task_handle",
                onSort: (evt: SortableEvent) => {
                    if (
                        evt.newIndex === undefined || evt.oldIndex === undefined
                    ) return;
                    const tl = task_list.value;
                    tl.splice(evt.newIndex, 0, tl.splice(evt.oldIndex, 1)[0]);
                },
            });
        }, [this.props.show]);
        useEffect(() => {
            const ws = new WebSocket(`${get_ws_host()}/api/task`);
            console.log(ws);
            task_ws.value = ws;
            function sendMessage(mes: TaskClientSocketData) {
                ws.send(JSON.stringify(mes));
            }
            ws.onopen = () => {
                sendMessage({ type: "task_list" });
            };
            ws.onmessage = (e) => {
                const t: TaskServerSocketData = JSON.parse(e.data);
                function sendTaskChangedEvent(id: number) {
                    self.dispatchEvent(
                        new CustomEvent("task_changed", { detail: id }),
                    );
                }
                if (t.type == "close") {
                    ws.close();
                } else if (t.type == "tasks") {
                    let running_index = -1;
                    t.tasks.forEach((ta) => {
                        const is_running = t.running.includes(ta.id);
                        tasks.value.set(ta.id, {
                            base: ta,
                            status: is_running
                                ? TaskStatus.Running
                                : TaskStatus.Wait,
                        });
                        const tl = task_list.value;
                        if (!tl.includes(ta.id)) {
                            tl.push(ta.id);
                            if (is_running) {
                                if (tl.length) {
                                    tl.splice(
                                        running_index + 1,
                                        0,
                                        tl.splice(tl.length - 1, 1)[0],
                                    );
                                }
                                running_index += 1;
                            }
                        }
                    });
                    this.forceUpdate();
                } else if (t.type == "new_task") {
                    tasks.value.set(t.detail.id, {
                        base: t.detail,
                        status: TaskStatus.Wait,
                    });
                    if (!task_list.value.includes(t.detail.id)) {
                        task_list.value.push(t.detail.id);
                    }
                    this.forceUpdate();
                } else if (t.type == "task_started") {
                    const task = tasks.value.get(t.detail.id);
                    if (task === undefined) {
                        tasks.value.set(t.detail.id, {
                            base: t.detail,
                            status: TaskStatus.Running,
                        });
                        const tl = task_list.value;
                        if (!tl.includes(t.detail.id)) {
                            tl.push(t.detail.id);
                            if (tl.length) {
                                tl.splice(0, 0, tl.splice(tl.length - 1, 1)[0]);
                            }
                        }
                        this.forceUpdate();
                    } else {
                        task.status = TaskStatus.Running;
                        sendTaskChangedEvent(t.detail.id);
                        const tl = task_list.value;
                        const ind = tl.indexOf(task.base.id);
                        if (ind > 0) {
                            tl.splice(0, 0, tl.splice(ind, 1)[0]);
                            this.sortable?.sort(tl.map((t) => t.toString()));
                        }
                    }
                } else if (t.type == "task_finished") {
                    const task = tasks.value.get(t.detail.id);
                    if (task !== undefined) {
                        task.status = TaskStatus.Finished;
                        sendTaskChangedEvent(t.detail.id);
                        const tl = task_list.value;
                        const ind = tl.indexOf(task.base.id);
                        if (ind < tl.length - 1 && ind > -1) {
                            tl.splice(tl.length - 1, 0, tl.splice(ind, 1)[0]);
                            this.sortable?.sort(tl.map((t) => t.toString()));
                        }
                    }
                } else if (t.type == "task_progress") {
                    const task = tasks.value.get(t.detail.task_id);
                    if (task !== undefined) {
                        task.progress = t.detail.detail;
                        sendTaskChangedEvent(t.detail.task_id);
                    }
                } else if (t.type == "task_updated") {
                    const task = tasks.value.get(t.detail.id);
                    if (task) {
                        task.base = t.detail;
                    }
                }
            };
            self.addEventListener("beforeunload", () => {
                sendMessage({ type: "close" });
            });
        }, []);
        if (!this.props.show) return null;
        const [flags, set_flags] = useState(TaskStatusFlag.All);
        return (
            <div class="task_manager">
                <Fab
                    class="new_task"
                    onClick={() => {
                        set_state(`${this.props.base}/new`);
                    }}
                >
                    <Icon>add</Icon>
                </Fab>
                <div class="task_amounts">
                    <TaskFilterBar value={flags} set_value={set_flags} />
                </div>
                <div
                    class="task_details"
                    // @ts-ignore Checked
                    ref={ul}
                >
                    {task_list.value.map((k) => {
                        const t = tasks.value.get(k);
                        if (t) {
                            if (!(flags & map_taskstatus(t.status))) {
                                return <div data-id={k}></div>;
                            }
                            return <Task task={t} />;
                        } else {
                            return <div data-id={k}></div>;
                        }
                    })}
                </div>
            </div>
        );
    }
}
