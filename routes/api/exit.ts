import { Handlers } from "$fresh/server.ts";
import { parse_bool } from "../../server/parse_form.ts";
import { get_task_manager } from "../../server.ts";
import { ExitTarget } from "../../signal_handler.ts";
import { AlreadyClosedError } from "../../task_manager.ts";
import type { User } from "../../db.ts";

export const handler: Handlers = {
    async POST(req, ctx) {
        const u = <User | undefined> ctx.state.user;
        if (u && !u.is_admin) {
            return new Response("Permission denied.", { status: 403 });
        }
        let force = false;
        try {
            const form = await req.formData();
            force = await parse_bool(form.get("force"), false);
        } catch (_) {
            null;
        }
        const h = async () => {
            const m = get_task_manager();
            const aborted = m.aborted;
            m.abort();
            if (force) {
                m.force_abort();
            }
            if (aborted) return;
            await m.waiting_unfinished_task();
            ExitTarget.dispatchEvent(new Event("close"));
            m.close();
            throw new AlreadyClosedError();
        };
        setTimeout(h, 1);
        return new Response("Aborted.");
    },
};
