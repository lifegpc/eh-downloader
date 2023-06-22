import { Handlers } from "$fresh/server.ts";
import { return_error } from "../../../server/utils.ts";
import { get_filemeta } from "../filemeta.ts";

export const handler: Handlers = {
    GET(_req, ctx) {
        const token = ctx.params.token;
        if (token) return get_filemeta(token);
        return return_error(400, "token is needed.");
    },
};
