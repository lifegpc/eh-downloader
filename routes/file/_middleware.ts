import { FreshContext } from "$fresh/server.ts";
import { get_task_manager } from "../../server.ts";

export async function handler(req: Request, ctx: FreshContext) {
    const res = await ctx.next();
    const m = get_task_manager();
    if (req.method === "OPTIONS" && res.status === 405) {
        const headers = new Headers();
        const allow = res.headers.get("Accept");
        if (allow) headers.set("Allow", allow);
        const origin = req.headers.get("origin");
        if (origin) {
            const c = m.cfg.cors_credentials_hosts.includes(origin);
            headers.set("Access-Control-Allow-Origin", origin);
            if (allow) headers.set("Access-Control-Allow-Methods", allow);
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Range, X-TOKEN",
            );
            if (c) headers.set("Access-Control-Allow-Credentials", "true");
            headers.set("Access-Control-Allow-Private-Network", "true");
        }
        return new Response(null, { status: 204, headers });
    } else {
        if (res.status === 101) return res;
        const headers = new Headers(res.headers);
        const origin = req.headers.get("origin");
        if (origin) {
            const c = m.cfg.cors_credentials_hosts.includes(origin);
            headers.set("Access-Control-Allow-Origin", origin);
            if (c) headers.set("Access-Control-Allow-Credentials", "true");
        }
        headers.append("Vary", "Origin");
        return new Response(res.body, {
            status: res.status,
            headers: headers,
            statusText: res.statusText,
        });
    }
}
