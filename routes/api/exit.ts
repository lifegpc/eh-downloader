import { Handlers } from "$fresh/server.ts";
import { parse_bool } from "../../server/parse_form.ts";
import { get_task_manager } from "../../server.ts";

export const handler: Handlers = {
    async POST(req, _ctx) {
        let force = false;
        try {
            const form = await req.formData();
            force = await parse_bool(form.get("force"), false);
        } catch (_) {
            null;
        }
        setTimeout(async () => {
            const m = get_task_manager();
            const aborted = m.aborted;
            m.abort();
            if (force) {
                m.force_abort();
            }
            if (aborted) return;
            await m.waiting_unfinished_task();
            m.close();
        }, 1);
        return new Response("Aborted.");
    },
};
