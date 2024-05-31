import { toJSON } from "../utils.ts";

export function get_ws_host() {
    const protocol = document.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${document.location.host}`;
}

export type JSONResult<T> = {
    ok: true;
    status: 0;
    data: T;
} | {
    ok: false;
    status: Exclude<number, 0>;
    error: string;
};

function gen_response<T>(
    d: JSONResult<T>,
    status = 200,
    headers: HeadersInit = {},
) {
    if (d.status !== 0) {
        status = (d.status >= 400 && d.status < 600) ? d.status : 400;
    }
    const h = new Headers(headers);
    h.set("Content-Type", "application/json; charset=UTF-8");
    return new Response(toJSON(d), { status, headers: h });
}

export function return_error<T = unknown>(
    status: Exclude<number, 0>,
    error: string,
    http_status = 200,
    headers: HeadersInit = {},
) {
    return gen_response<T>({ ok: false, status, error }, http_status, headers);
}

export function return_data<T = unknown>(
    data: T,
    status = 200,
    headers: HeadersInit = {},
) {
    return gen_response<T>({ ok: true, status: 0, data }, status, headers);
}

export function gen_data<T = unknown>(data: T): JSONResult<T> {
    return { ok: true, status: 0, data };
}

export function gen_error<T = unknown>(
    status: Exclude<number, 0>,
    error: string,
): JSONResult<T> {
    return { ok: false, status, error };
}

export function return_json<T = unknown>(data: T, status = 200) {
    return new Response(toJSON(data), {
        status,
        headers: { "Content-Type": "application/json; chatset=UTF-8" },
    });
}

export function get_host(req: Request) {
    const u = new URL(req.url);
    const proto = req.headers.get("X-Forwarded-Proto");
    return proto ? `${proto}://${u.host}` : u.origin;
}
