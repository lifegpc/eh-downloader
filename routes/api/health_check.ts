import { Handlers } from "$fresh/server.ts";
import { return_data } from "../../server/utils.ts";

export const handler: Handlers = {
    GET(_req, _ctx) {
        return return_data(true);
    },
};
