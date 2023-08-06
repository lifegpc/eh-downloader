import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { get_task_manager } from "../../server.ts";
import { parse_cookies } from "../../server/cookies.ts";
import { return_error } from "../../server/utils.ts";
import type { Token } from "../../db.ts";
import pbkdf2Hmac from "pbkdf2-hmac";
import { encode } from "std/encoding/base64.ts";

async function handle_auth(req: Request, ctx: MiddlewareHandlerContext) {
    if (req.method === "OPTIONS") return true;
    const m = get_task_manager();
    if (m.db.get_user_count() === 0) return true;
    const u = new URL(req.url);
    let is_from_cookie = false;
    let token: string | null | undefined = req.headers.get("X-TOKEN");
    const cookies = parse_cookies(req.headers.get("Cookie"));
    if (!token) {
        token = cookies.get("token");
        is_from_cookie = true;
    }
    const check = async () => {
        if (u.pathname === "/api/token" && req.method === "PUT") return true;
        if (u.pathname === "/api/status" && req.method === "GET") return true;
        if (m.cfg.img_verify_bypass_auth) {
            if (
                u.pathname.startsWith("/api/file") ||
                u.pathname.startsWith("/api/thumbnail")
            ) {
                if (ctx.params.id) {
                    const verify = u.searchParams.get("verify");
                    if (verify) {
                        const tverify = encode(
                            new Uint8Array(
                                await pbkdf2Hmac(
                                    `${ctx.params.id}`,
                                    m.cfg.img_verify_secret,
                                    1000,
                                    64,
                                    "SHA-512",
                                ),
                            ),
                        );
                        if (verify === tverify) return true;
                    }
                }
            }
        }
        return false;
    };
    if (!token) return await check();
    const t = m.db.get_token(token);
    const now = (new Date()).getTime();
    if (!t || t.expired.getTime() < now) return await check();
    const user = m.db.get_user(t.uid);
    if (!user) {
        m.db.delete_token(token);
        return await check();
    }
    ctx.state.user = user;
    ctx.state.is_from_cookie = is_from_cookie;
    ctx.state.token = t;
    return true;
}

export async function handler(req: Request, ctx: MiddlewareHandlerContext) {
    if (!(await handle_auth(req, ctx))) {
        return return_error(401, "Unauthorized");
    }
    const res = await ctx.next();
    if (req.method === "OPTIONS" && res.status === 405) {
        const headers = new Headers();
        const allow = res.headers.get("Accept");
        if (allow) headers.set("Allow", allow);
        const origin = req.headers.get("origin");
        if (origin) {
            headers.set("Access-Control-Allow-Origin", "*");
            if (allow) headers.set("Access-Control-Allow-Methods", allow);
            headers.set("Access-Control-Allow-Headers", "Content-Type, Range");
        }
        return new Response(null, { status: 204, headers });
    } else {
        if (res.status === 101) return res;
        const headers = new Headers(res.headers);
        const origin = req.headers.get("origin");
        if (origin) {
            headers.set("Access-Control-Allow-Origin", "*");
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
                        }${t.secure ? "; Secure" : ""}`,
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
