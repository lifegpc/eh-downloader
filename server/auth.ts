import { parse_bool } from "./parse.ts";
import { set_state } from "./state.ts";
import type { StatusData } from "./status.ts";
import type { BUser } from "./user.ts";
import type { JSONResult } from "./utils.ts";

export async function check_auth_status() {
    const re = await fetch("/api/user");
    const u: JSONResult<BUser> = await re.json();
    if (u.ok) return true;
    if (u.status !== 404 && u.status !== 1) {
        throw Error(u.error);
    }
    const re2 = await fetch("/api/status");
    const s: JSONResult<StatusData> = await re2.json();
    if (!s.ok) {
        throw Error(u.error);
    }
    if (s.data.no_user) {
        if (!parse_bool(localStorage.getItem("skip_create_root_user"), false)) {
            set_state("#/create_root_user");
        }
    }
}
