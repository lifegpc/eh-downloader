import { Handlers } from "$fresh/server.ts";
import { User, UserPermission } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { parse_bool } from "../../../server/parse_form.ts";
import { return_data, return_error } from "../../../server/utils.ts";
import { walk } from "@std/fs/walk";
import { isAbsolute } from "@std/path";

type _File = {
    name: string;
    dir: boolean;
};

export type FileList = {
    current: string;
    list: _File[];
};

export const handler: Handlers = {
    async GET(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (
            user && !user.is_admin &&
            !(user.permissions & UserPermission.ManageTasks)
        ) {
            return return_error(403, "Permission denied.");
        }
        const u = new URL(req.url);
        const dir = await parse_bool(u.searchParams.get("dir"), true);
        const file = await parse_bool(u.searchParams.get("file"), true);
        let path = u.searchParams.get("path");
        const m = get_task_manager();
        if (!path) {
            path = m.cfg.base;
        }
        if (!isAbsolute(path)) {
            path = await Deno.realPath(path);
        }
        const list: _File[] = [];
        for await (
            const i of walk(path, {
                maxDepth: 1,
                includeDirs: dir,
                includeFiles: file,
                followSymlinks: true,
            })
        ) {
            if (i.path != path) {
                list.push({ name: i.name, dir: i.isDirectory });
            }
        }
        return return_data<FileList>({ current: path, list });
    },
};
