import { Handlers } from "$fresh/server.ts";
import { get_task_manager } from "../../server.ts";
import { StatusData } from "../../server/status.ts";
import { return_data } from "../../server/utils.ts";
import { check_ffmpeg_binary } from "../../thumbnail/ffmpeg_binary.ts";

export const handler: Handlers = {
    async GET(_req, _ctx) {
        const m = get_task_manager();
        const ffmpeg_binary_enabled = await check_ffmpeg_binary(
            m.cfg.ffmpeg_path,
        );
        const meilisearch_enabled = m.meilisearch !== undefined;
        const meilisearch = meilisearch_enabled && m.cfg.meili_host &&
                m.cfg.meili_update_api_key
            ? {
                host: m.cfg.meili_host,
                key: m.cfg.meili_search_api_key ||
                    m.cfg.meili_update_api_key,
            }
            : undefined;
        return return_data<StatusData>({
            ffmpeg_binary_enabled,
            meilisearch_enabled,
            meilisearch,
        });
    },
};
