import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../server.ts";
import type { StatusData } from "../../server/status.ts";
import { get_host, return_data } from "../../server/utils.ts";
import { check_ffmpeg_binary } from "../../thumbnail/ffmpeg_binary.ts";
import type * as FFMPEG_API from "../../thumbnail/ffmpeg_api.ts";
import { isDocker } from "../../utils.ts";
import type * as LIBZIP from "@lifegpc/libzip/raw";

let ffmpeg_api: typeof FFMPEG_API | undefined;
let libzip: typeof LIBZIP | undefined;

async function check_ffmpeg_api() {
    if (ffmpeg_api) return true;
    try {
        ffmpeg_api = await import("../../thumbnail/ffmpeg_api.ts");
        return true;
    } catch (_) {
        return false;
    }
}

async function check_libzip() {
    if (libzip) return true;
    try {
        libzip = await import("@lifegpc/libzip/raw");
        return true;
    } catch (_) {
        return false;
    }
}

export const handler: Handlers = {
    async GET(req, ctx) {
        const m = get_task_manager();
        const c = m.db.get_user_count();
        const is_authed = ctx.state.user !== undefined ||
            c === 0 || c === 0n;
        const ffmpeg_binary_enabled = await check_ffmpeg_binary(
            m.cfg.ffmpeg_path,
        );
        const ffmpeg_api_enabled = await check_ffmpeg_api();
        const ffprobe_binary_enabled = await check_ffmpeg_binary(
            m.cfg.ffprobe_path,
        );
        const meilisearch_enabled = m.meilisearch !== undefined;
        let meilisearch;
        if (
            is_authed && meilisearch_enabled && m.cfg.meili_host &&
            m.cfg.meili_update_api_key
        ) {
            const rhost = get_host(req);
            const hosts = m.cfg.meili_hosts;
            let host: string | undefined;
            if (hosts !== undefined) {
                if (hosts[rhost]) {
                    host = hosts[rhost];
                }
            }
            if (!host) host = m.cfg.meili_host;
            meilisearch = {
                host,
                key: m.cfg.meili_search_api_key || m.cfg.meili_update_api_key,
            };
        }
        const libzip_enabled = await check_libzip();
        const no_user = c === 0 || c === 0n;
        const is_docker = isDocker();
        return return_data<StatusData>({
            ffmpeg_api_enabled,
            ffmpeg_binary_enabled,
            ffprobe_binary_enabled,
            meilisearch_enabled,
            meilisearch,
            no_user,
            is_docker,
            libzip_enabled,
        });
    },
};
