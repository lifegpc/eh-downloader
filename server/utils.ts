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

function gen_response<T>(d: JSONResult<T>, status = 200) {
    if (d.status !== 0) {
        status = (d.status >= 400 && d.status < 600) ? d.status : 400;
    }
    return new Response(JSON.stringify(d), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

export function return_error<T = unknown>(
    status: Exclude<number, 0>,
    error: string,
) {
    return gen_response<T>({ ok: false, status, error });
}

export function return_data<T = unknown>(data: T, status = 200) {
    return gen_response<T>({ ok: true, status: 0, data }, status);
}

export function return_json<T = unknown>(data: T, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

export function get_host(req: Request) {
    const u = new URL(req.url);
    const proto = req.headers.get("X-Forwarded-Proto");
    return proto ? `${proto}://${u.host}` : u.origin;
}
