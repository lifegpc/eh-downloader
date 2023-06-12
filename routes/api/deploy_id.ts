import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
    GET(_req, _ctx) {
        const data = { id: Deno.env.get("DENO_DEPLOYMENT_ID") };
        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" },
        });
    },
};
