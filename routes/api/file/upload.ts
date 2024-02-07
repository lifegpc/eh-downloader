import { Handlers } from "$fresh/server.ts";
import type { EhFile, User } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { return_data, return_error } from "../../../server/utils.ts";
import { get_string, parse_bool } from "../../../server/parse_form.ts";
import { fb_get_size } from "../../../thumbnail/ffmpeg_binary.ts";
import { sure_dir } from "../../../utils.ts";
import mime from "mime";
import { extname, join, resolve } from "std/path/mod.ts";
import { UserPermission } from "../../../db.ts";

export const handler: Handlers = {
    async POST(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (
            user && !user.is_admin &&
            !(user.permissions & UserPermission.EditGallery)
        ) {
            return return_error(403, "Permission denied.");
        }
        const m = get_task_manager();
        try {
            const form = await req.formData();
            const file = form.get("file");
            if (!file) {
                return return_error(1, "Missing file.");
            }
            const mext = typeof file === "string"
                ? null
                : `.${mime.getExtension(file.type)}`;
            const filename = (await get_string(form.get("filename"))) ||
                (typeof file === "string" ? null : file.name);
            if (!filename) {
                return return_error(2, "Missing filename.");
            }
            const fext = extname(filename);
            const fn = mext == fext
                ? filename
                : `${filename.slice(0, filename.length - fext.length)}${mext}`;
            const dir = (await get_string(form.get("dir"))) ||
                join(m.cfg.base, "uploaded");
            const is_original = await parse_bool(
                form.get("is_original"),
                false,
            );
            const token = await get_string(form.get("token"));
            if (!token) {
                return return_error(3, "Missing token.");
            }
            const path = join(dir, fn);
            await sure_dir(dir);
            try {
                if (typeof file === "string") {
                    await Deno.writeTextFile(path, file);
                } else {
                    await Deno.writeFile(path, file.stream());
                }
                const size = await fb_get_size(path);
                if (!size) {
                    await Deno.remove(path);
                    return return_error(4, "Failed to get file size.");
                }
                const rpath = resolve(path);
                const f = {
                    id: 0,
                    path: rpath,
                    width: size.width,
                    height: size.height,
                    is_original,
                    token,
                } as EhFile;
                const nf = m.db.add_file(f, false);
                return return_data(nf);
            } catch (e) {
                await Deno.remove(path);
                throw e;
            }
        } catch (e) {
            console.error(e);
            return return_error(500, "Internal Server Error.");
        }
    },
};
