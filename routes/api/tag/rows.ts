import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../../server.ts";
import { return_data } from "../../../server/utils.ts";

export const handler: Handlers = {
    GET(_req, _ctx) {
        const m = get_task_manager();
        return return_data(m.db.get_tag_rows());
    },
};
