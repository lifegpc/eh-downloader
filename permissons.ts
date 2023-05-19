export async function check_file_permissions(path: string) {
    const status1 = await Deno.permissions.request({ name: "read", path });
    const status2 = await Deno.permissions.request({ name: "write", path });
    return status1.state == "granted" && status2.state == "granted";
}
