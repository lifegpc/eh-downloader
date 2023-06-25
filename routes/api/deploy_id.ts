import { Handlers } from "$fresh/server.ts";
import { return_json } from "../../server/utils.ts";

export const handler: Handlers = {
    GET(_req, _ctx) {
        const data = { id: Deno.env.get("DENO_DEPLOYMENT_ID") };
        return return_json(data);
    },
};
