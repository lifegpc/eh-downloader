import { TaskManager } from "./task_manager.ts";

export const ExitTarget = new EventTarget();

export function add_exit_handler(m: TaskManager) {
    let first_aborted = true;
    let ignore_signal = false;
    const handler = async () => {
        if (ignore_signal) return;
        if (first_aborted) {
            m.abort();
            console.log(
                "Already abort all tasks. Please wait for a while. You can press Ctrl + C again to force abort.",
            );
            first_aborted = false;
        } else {
            m.force_abort();
            ignore_signal = true;
            return;
        }
        await m.waiting_unfinished_task();
        ExitTarget.dispatchEvent(new Event("close"));
        m.close();
    };
    Deno.addSignalListener("SIGINT", handler);
    if (Deno.build.os !== "windows") {
        Deno.addSignalListener("SIGKILL", () => {
            m.abort();
            m.force_abort();
            ExitTarget.dispatchEvent(new Event("close"));
            m.close();
        });
    }
}

export function get_abort_signal(callback?: () => void): AbortSignal {
    const a = new AbortController();
    const handler = () => {
        a.abort();
        if (callback) callback();
    };
    Deno.addSignalListener("SIGINT", handler);
    if (Deno.build.os !== "windows") {
        Deno.addSignalListener("SIGKILL", handler);
    }
    return a.signal;
}
