import { Handlers } from "$fresh/server.ts";
import { return_data, return_error } from "../../server/utils.ts";
import { User, UserPermission } from "../../db.ts";
import { get_string, parse_int } from "../../server/parse_form.ts";
import { base_logger, LogLevel } from "../../utils/logger.ts";

export const handler: Handlers = {
    async DELETE(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (
            user && !user.is_admin &&
            !(Number(user.permissions) & UserPermission.QueryLog)
        ) {
            return return_error(403, "Permission denied.");
        }
        let form: FormData | undefined;
        try {
            form = await req.formData();
        } catch (_) {
            return return_error(400, "Bad Request");
        }
        const typ = await get_string(form.get("type"));
        const min_level = await parse_int(form.get("min_level"), null);
        const max_level = await parse_int(form.get("max_level"), null);
        const deleted_level = (await get_string(form.get("deleted_level")))
            ?.split(",")?.map((x) => parseInt(x))?.filter((x) => !isNaN(x));
        const end = await get_string(form.get("end_time"));
        const endt = parseInt(end ?? "");
        let end_time: Date | null;
        try {
            end_time = end === null ? null : new Date(isNaN(endt) ? end : endt);
        } catch (e) {
            base_logger.log("Failed to parse end_time:", e);
            return return_error(1, "Failed to parse end_time.");
        }
        base_logger.clear(typ, min_level, max_level, deleted_level, end_time);
        return return_data(true);
    },
    async GET(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (
            user && !user.is_admin &&
            !(Number(user.permissions) & UserPermission.QueryLog)
        ) {
            return return_error(403, "Permission denied.");
        }
        const u = new URL(req.url);
        const params = u.searchParams;
        const page = await parse_int(params.get("page"), null);
        const limit = await parse_int(params.get("limit"), 50);
        const offset = await parse_int(params.get("offset"), 0);
        const type = params.get("type");
        let min_level = await parse_int(
            params.get("min_level"),
            null,
        );
        const allowed_level = params.get("allowed_level")?.split(",").map((x) =>
            parseInt(x)
        ).filter((x) => !isNaN(x));
        if (!allowed_level && min_level === null) {
            min_level = LogLevel.Log;
        }
        const datas = page === null
            ? base_logger.list(offset, limit, type, min_level, allowed_level)
            : base_logger.list_page(
                page,
                limit,
                type,
                min_level,
                allowed_level,
            );
        const count = page === null
            ? undefined
            : base_logger.count(type, min_level, allowed_level);
        return return_data({ datas, count });
    },
};
