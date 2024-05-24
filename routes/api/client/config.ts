import { Handlers } from "$fresh/server.ts";
import { User } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { get_string } from "../../../server/parse_form.ts";
import { return_data, return_error } from "../../../server/utils.ts";

export const handler: Handlers = {
    async DELETE(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (!user) {
            return return_error(403, "Permission denied.");
        }
        let d: FormData | null = null;
        try {
            d = await req.formData();
        } catch (_) {
            return return_error(1, "Invalid parameters.");
        }
        const client = await get_string(d.get("client"));
        if (!client) return return_error(2, "client is needed.");
        const name = await get_string(d.get("name"));
        if (!name) return return_error(2, "name is needed.");
        const m = get_task_manager();
        m.db.delete_client_config(user.id, client, name);
        return return_data({});
    },
    GET(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (!user) {
            return return_error(403, "Permission denied.");
        }
        const d = new URL(req.url).searchParams;
        const client = d.get("client");
        if (!client) return return_error(2, "client is needed.");
        const name = d.get("name");
        const m = get_task_manager();
        if (name) {
            const data = m.db.get_client_config(user.id, client, name);
            if (data === null) return return_error(404, "Not found");
            return return_data(data.data);
        } else {
            return return_data(
                m.db.list_client_configs(user.id, client).map((d) => d.name),
            );
        }
    },
    async PUT(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (!user) {
            return return_error(403, "Permission denied.");
        }
        let d: FormData | null = null;
        try {
            d = await req.formData();
        } catch (_) {
            return return_error(1, "Invalid parameters.");
        }
        const client = await get_string(d.get("client"));
        if (!client) return return_error(2, "client is needed.");
        const name = await get_string(d.get("name"));
        if (!name) return return_error(2, "name is needed.");
        const data = await get_string(d.get("data"));
        if (data === null) return return_error(2, "data is needed.");
        const m = get_task_manager();
        m.db.add_client_config({ uid: user.id, client, name, data });
        return return_data({});
    },
};
