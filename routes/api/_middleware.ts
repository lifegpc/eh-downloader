import { FreshContext } from "$fresh/server.ts";
import { get_task_manager } from "../../server.ts";
import { parse_cookies } from "../../server/cookies.ts";
import { return_error } from "../../server/utils.ts";
import type { Token } from "../../db.ts";

function handle_auth(req: Request, ctx: FreshContext) {
    if (req.method === "OPTIONS") return true;
    const m = get_task_manager();
    const c = m.db.get_user_count();
    if (c === 0 || c === 0n) return true;
    const u = new URL(req.url);
    let is_from_cookie = false;
    let token: string | null | undefined = req.headers.get("X-TOKEN");
    const cookies = parse_cookies(req.headers.get("Cookie"));
    if (!token) {
        token = cookies.get("token");
        is_from_cookie = true;
    }
    const check = () => {
        if (u.pathname === "/api/token" && req.method === "PUT") return true;
        if (u.pathname === "/api/status" && req.method === "GET") return true;
        if (u.pathname === "/api/health_check" && req.method === "GET") {
            return true;
        }
        if (
            m.cfg.random_file_secret &&
            (u.pathname == "/api/file/random" ||
                u.pathname.match(/^\/api\/file\/\d+/) ||
                u.pathname.match(/^\/api\/thumbnail\/\d+/)) &&
            req.method === "GET" && u.searchParams.get("token")
        ) {
            return true;
        }
        // 适配 U2 将 & 编码为 &amp;
        if (
            m.cfg.random_file_secret && u.pathname == "/api/file/random" &&
            req.method == "GET" && u.searchParams.get("amp;token")
        ) {
            return true;
        }
        return false;
    };
    if (!token) return check();
    const t = m.db.get_token(token);
    const now = (new Date()).getTime();
    if (!t || t.expired.getTime() < now) return check();
    const user = m.db.get_user(t.uid);
    if (!user) {
        m.db.delete_token(token);
        return check();
    }
    ctx.state.user = user;
    ctx.state.is_from_cookie = is_from_cookie;
    ctx.state.token = t;
    m.db.update_token_last_used(token);
    return true;
}

export async function handler(req: Request, ctx: FreshContext) {
    const m = get_task_manager();
    if (!(handle_auth(req, ctx))) {
        const headers: HeadersInit = {};
        const origin = req.headers.get("origin");
        if (origin) {
            const c = m.cfg.cors_credentials_hosts.includes(origin);
            headers["Access-Control-Allow-Origin"] = origin;
            if (c) headers["Access-Control-Allow-Credentials"] = "true";
        }
        return return_error(401, "Unauthorized", 401, headers);
    }
    const res = await ctx.next();
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
        if (ctx.state.is_from_cookie && ctx.state.token) {
            const m = get_task_manager();
            const ot = <Token> ctx.state.token;
            const now = (new Date()).getTime();
            if (ot.expired.getTime() - 2505600000 < now) {
                try {
                    const t = m.db.update_token(ot.token, now);
                    headers.append(
                        "Set-Cookie",
                        `token=${t.token}; Expires=${t.expired.toUTCString()}${
                            t.http_only ? "; HttpOnly" : ""
                        }${
                            t.secure
                                ? "; SameSite=None; Secure; Partitioned"
                                : ""
                        }; Path=/api`,
                    );
                } catch {
                    null;
                }
            }
        }
        return new Response(res.body, {
            status: res.status,
            headers: headers,
            statusText: res.statusText,
        });
    }
}
