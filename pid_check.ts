import { exists } from "@std/fs/exists";

export async function check_running(pid: number | bigint) {
    if (Deno.build.os == "windows") {
        const cmd = new Deno.Command("tasklist.exe", {
            args: ["/NH", "/FI", `pid eq ${pid}`],
            stdout: "piped",
        });
        const c = cmd.spawn();
        const o = await c.output();
        if (o.code !== 0) return;
        const s = (new TextDecoder()).decode(o.stdout);
        return s.indexOf(`${pid}`) !== -1;
    } else if (Deno.build.os == "linux") {
        return await exists(`/proc/${pid}`);
    }
}
