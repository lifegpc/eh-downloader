import { Component, ContextType } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { GlobalCtx } from "../components/GlobalContext.tsx";
import { TaskDetail, TaskStatus } from "../task.ts";
import { Sortable } from "sortable";
import { TaskClientSocketData, TaskServerSocketData } from "../server/task.ts";
import { get_ws_host } from "../server/utils.ts";

export type TaskManagerProps = {
    show: boolean;
};

export default class TaskManager extends Component<TaskManagerProps> {
    static contextType = GlobalCtx;
    declare context: ContextType<typeof GlobalCtx>;
    render() {
        if (!this.props.show) return null;
        const [tasks, set_tasks] = useState<Map<number, TaskDetail>>(new Map());
        const ul = useRef<HTMLDivElement>();
        useEffect(() => {
            new Sortable(ul.current, {
                onSort: (evt: CustomEvent) => {
                    console.log(evt);
                },
            });
            const ws = new WebSocket(`${get_ws_host()}/api/task`);
            console.log(ws);
            function sendMessage(mes: TaskClientSocketData) {
                ws.send(JSON.stringify(mes));
            }
            ws.onopen = () => {
                sendMessage({ type: "task_list" });
            };
            ws.onmessage = (e) => {
                const t: TaskServerSocketData = JSON.parse(e.data);
                if (t.type == "close") {
                    ws.close();
                } else if (t.type == "tasks") {
                    set_tasks((tasks) => {
                        t.tasks.forEach((ta) => {
                            tasks.set(ta.id, {
                                base: ta,
                                status: t.running.includes(ta.id)
                                    ? TaskStatus.Running
                                    : TaskStatus.Wait,
                            });
                        });
                        this.forceUpdate();
                        return tasks;
                    });
                } else if (t.type == "new_task") {
                    set_tasks((tasks) => {
                        tasks.set(t.detail.id, {
                            base: t.detail,
                            status: TaskStatus.Wait,
                        });
                        this.forceUpdate();
                        return tasks;
                    });
                }
            };
            self.addEventListener("beforeunload", () => {
                sendMessage({ type: "close" });
            });
        }, []);
        console.log(tasks.size);
        return (
            <div class="task_manager">
                <div
                    id="task-list"
                    // @ts-ignore checked
                    ref={ul}
                >
                    {Array.from(tasks.keys()).map((k) => <div>{k}</div>)}
                </div>
            </div>
        );
    }
}
