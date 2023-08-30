import { MiddlewareHandlerContext } from "$fresh/server.ts";

export async function handler(req: Request, ctx: MiddlewareHandlerContext) {
    const res = await ctx.next();
    if (req.method === "OPTIONS" && res.status === 405) {
        const headers = new Headers();
        const allow = res.headers.get("Accept");
        if (allow) headers.set("Allow", allow);
        const origin = req.headers.get("origin");
        if (origin) {
            headers.set("Access-Control-Allow-Origin", origin);
            if (allow) headers.set("Access-Control-Allow-Methods", allow);
            headers.set("Access-Control-Allow-Headers", "Content-Type, Range");
            headers.set("Access-Control-Allow-Credentials", "true");
        }
        return new Response(null, { status: 204, headers });
    } else {
        if (res.status === 101) return res;
        const headers = new Headers(res.headers);
        const origin = req.headers.get("origin");
        if (origin) {
            headers.set("Access-Control-Allow-Origin", origin);
        }
        return new Response(res.body, {
            status: res.status,
            headers: headers,
            statusText: res.statusText,
        });
    }
}
