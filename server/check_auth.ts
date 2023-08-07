import { get_task_manager } from "../server.ts";
import { parse_cookies } from "./cookies.ts";

export function check_auth(req: Request) {
    if (req.method === "OPTIONS") return true;
    const m = get_task_manager();
    if (m.db.get_user_count() === 0) return true;
    const u = new URL(req.url);
    let token: string | null | undefined = req.headers.get("X-TOKEN");
    const cookies = parse_cookies(req.headers.get("Cookie"));
    if (!token) {
        token = cookies.get("token");
    }
    const check = () => {
        if (u.pathname === "/api/token" && req.method === "PUT") return true;
        if (u.pathname === "/api/status" && req.method === "GET") return true;
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
    return true;
}
