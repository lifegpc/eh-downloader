import { Handlers } from "$fresh/server.ts";
import type { GID } from "../../../client.ts";
import { User, UserPermission } from "../../../db.ts";
import { get_task_manager } from "../../../server.ts";
import { EHMetaInfo } from "../../../server/eh.ts";
import { parse_int } from "../../../server/parse_form.ts";
import {
    gen_data,
    gen_error,
    return_data,
    return_error,
} from "../../../server/utils.ts";
import { base_logger } from "../../../utils/logger.ts";
import { unescape } from "@std/html";

const logger = base_logger.get_logger("api-eh-metadata");

export const handler: Handlers = {
    async GET(req, ctx) {
        const user = <User | undefined> ctx.state.user;
        if (
            user && !user.is_admin &&
            !(Number(user.permissions) & UserPermission.ManageTasks)
        ) {
            return return_error(403, "Permission denied.");
        }
        const m = get_task_manager();
        const url = new URL(req.url);
        const gids: Array<number> = [];
        for (const gid of url.searchParams.getAll("gid")) {
            const i = await parse_int(gid, null);
            if (i === null) {
                return return_error(1, `Invalid gid: ${gid}`);
            }
            gids.push(i);
        }
        for (const gid of url.searchParams.getAll("gid[]")) {
            const i = await parse_int(gid, null);
            if (i === null) {
                return return_error(1, `Invalid gid: ${gid}`);
            }
            gids.push(i);
        }
        const tokens = url.searchParams.getAll("token").concat(
            url.searchParams.getAll("token[]"),
        );
        if (gids.length === 0 && tokens.length === 0) {
            return return_error(2, "No gids and tokens provided.");
        }
        if (gids.length !== tokens.length) {
            return return_error(3, "Length of gids and tokens do not match.");
        }
        const data: EHMetaInfo = {};
        const needed: GID[] = [];
        for (let i = 0; i < gids.length; i++) {
            const gid = gids[i];
            const token = tokens[i];
            const cache = m.db.get_ehmeta(gid);
            if (cache && cache.gid === gid && cache.token === token) {
                data[gid] = gen_data(cache);
            } else if (cache && cache.gid === gid) {
                data[gid] = gen_error(1, "Token not matched.");
            } else {
                needed.push([gid, token]);
            }
        }
        while (needed.length > 0) {
            const query = needed.splice(0, 25);
            try {
                const metas = await m.client.fetchGalleryMetadataByAPI(
                    ...query,
                );
                for (const [k, v] of metas.map) {
                    if (typeof v === "string") {
                        data[k.toString()] = gen_error(2, v);
                    } else {
                        v.title = unescape(v.title);
                        v.title_jpn = unescape(v.title_jpn);
                        v.uploader = unescape(v.uploader);
                        data[k.toString()] = gen_data(v);
                        m.db.add_ehmeta(v);
                    }
                }
            } catch (e) {
                logger.error("Failed to fetch metadata:", e);
                const mes = e instanceof Error ? e.message : e;
                return return_error(
                    4,
                    `Failed to fetch metadata: ${mes}`,
                );
            }
        }
        return return_data(data);
    },
};
