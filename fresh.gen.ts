// DO NOT EDIT. This file is generated by Fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $_middleware from "./routes/_middleware.ts";
import * as $api_middleware from "./routes/api/_middleware.ts";
import * as $api_client_config from "./routes/api/client/config.ts";
import * as $api_config from "./routes/api/config.ts";
import * as $api_deploy_id from "./routes/api/deploy_id.ts";
import * as $api_eh_image_limit from "./routes/api/eh/image_limit.ts";
import * as $api_eh_metadata from "./routes/api/eh/metadata.ts";
import * as $api_exit from "./routes/api/exit.ts";
import * as $api_export_gallery_zip_gid_ from "./routes/api/export/gallery/zip/[gid].ts";
import * as $api_file_id_ from "./routes/api/file/[id].ts";
import * as $api_file_random from "./routes/api/file/random.ts";
import * as $api_file_upload from "./routes/api/file/upload.ts";
import * as $api_filemeta from "./routes/api/filemeta.ts";
import * as $api_filemeta_token_ from "./routes/api/filemeta/[token].ts";
import * as $api_files_token_ from "./routes/api/files/[token].ts";
import * as $api_fs_list from "./routes/api/fs/list.ts";
import * as $api_gallery_gid_ from "./routes/api/gallery/[gid].ts";
import * as $api_gallery_list from "./routes/api/gallery/list.ts";
import * as $api_gallery_meta_gids_ from "./routes/api/gallery/meta/[gids].ts";
import * as $api_gallery_thumbnail_gids_ from "./routes/api/gallery/thumbnail/[gids].ts";
import * as $api_health_check from "./routes/api/health_check.ts";
import * as $api_log from "./routes/api/log.ts";
import * as $api_log_id_ from "./routes/api/log/[id].ts";
import * as $api_log_realtime from "./routes/api/log/realtime.ts";
import * as $api_shared_token from "./routes/api/shared_token.ts";
import * as $api_shared_token_list from "./routes/api/shared_token/list.ts";
import * as $api_status from "./routes/api/status.ts";
import * as $api_tag_id_ from "./routes/api/tag/[id].ts";
import * as $api_tag_rows from "./routes/api/tag/rows.ts";
import * as $api_task from "./routes/api/task.ts";
import * as $api_task_download_cfg from "./routes/api/task/download_cfg.ts";
import * as $api_task_export_zip_cfg from "./routes/api/task/export_zip_cfg.ts";
import * as $api_task_import_cfg from "./routes/api/task/import_cfg.ts";
import * as $api_thumbnail_id_ from "./routes/api/thumbnail/[id].ts";
import * as $api_token from "./routes/api/token.ts";
import * as $api_token_manage from "./routes/api/token/manage.ts";
import * as $api_user from "./routes/api/user.ts";
import * as $api_user_change_name from "./routes/api/user/change_name.ts";
import * as $api_user_change_password from "./routes/api/user/change_password.ts";
import * as $api_user_list from "./routes/api/user/list.ts";
import * as $file_id_ from "./routes/file/[id].ts";
import * as $file_verify_id_ from "./routes/file/[verify]/[id].ts";
import * as $file_middleware from "./routes/file/_middleware.ts";
import * as $index from "./routes/index.ts";
import * as $thumbnail_id_ from "./routes/thumbnail/[id].ts";
import * as $thumbnail_verify_id_ from "./routes/thumbnail/[verify]/[id].ts";
import * as $thumbnail_middleware from "./routes/thumbnail/_middleware.ts";
import * as $upload from "./routes/upload.tsx";
import * as $Upload from "./islands/Upload.tsx";
import type { Manifest } from "$fresh/server.ts";

const manifest = {
    routes: {
        "./routes/_middleware.ts": $_middleware,
        "./routes/api/_middleware.ts": $api_middleware,
        "./routes/api/client/config.ts": $api_client_config,
        "./routes/api/config.ts": $api_config,
        "./routes/api/deploy_id.ts": $api_deploy_id,
        "./routes/api/eh/image_limit.ts": $api_eh_image_limit,
        "./routes/api/eh/metadata.ts": $api_eh_metadata,
        "./routes/api/exit.ts": $api_exit,
        "./routes/api/export/gallery/zip/[gid].ts":
            $api_export_gallery_zip_gid_,
        "./routes/api/file/[id].ts": $api_file_id_,
        "./routes/api/file/random.ts": $api_file_random,
        "./routes/api/file/upload.ts": $api_file_upload,
        "./routes/api/filemeta.ts": $api_filemeta,
        "./routes/api/filemeta/[token].ts": $api_filemeta_token_,
        "./routes/api/files/[token].ts": $api_files_token_,
        "./routes/api/fs/list.ts": $api_fs_list,
        "./routes/api/gallery/[gid].ts": $api_gallery_gid_,
        "./routes/api/gallery/list.ts": $api_gallery_list,
        "./routes/api/gallery/meta/[gids].ts": $api_gallery_meta_gids_,
        "./routes/api/gallery/thumbnail/[gids].ts":
            $api_gallery_thumbnail_gids_,
        "./routes/api/health_check.ts": $api_health_check,
        "./routes/api/log.ts": $api_log,
        "./routes/api/log/[id].ts": $api_log_id_,
        "./routes/api/log/realtime.ts": $api_log_realtime,
        "./routes/api/shared_token.ts": $api_shared_token,
        "./routes/api/shared_token/list.ts": $api_shared_token_list,
        "./routes/api/status.ts": $api_status,
        "./routes/api/tag/[id].ts": $api_tag_id_,
        "./routes/api/tag/rows.ts": $api_tag_rows,
        "./routes/api/task.ts": $api_task,
        "./routes/api/task/download_cfg.ts": $api_task_download_cfg,
        "./routes/api/task/export_zip_cfg.ts": $api_task_export_zip_cfg,
        "./routes/api/task/import_cfg.ts": $api_task_import_cfg,
        "./routes/api/thumbnail/[id].ts": $api_thumbnail_id_,
        "./routes/api/token.ts": $api_token,
        "./routes/api/token/manage.ts": $api_token_manage,
        "./routes/api/user.ts": $api_user,
        "./routes/api/user/change_name.ts": $api_user_change_name,
        "./routes/api/user/change_password.ts": $api_user_change_password,
        "./routes/api/user/list.ts": $api_user_list,
        "./routes/file/[id].ts": $file_id_,
        "./routes/file/[verify]/[id].ts": $file_verify_id_,
        "./routes/file/_middleware.ts": $file_middleware,
        "./routes/index.ts": $index,
        "./routes/thumbnail/[id].ts": $thumbnail_id_,
        "./routes/thumbnail/[verify]/[id].ts": $thumbnail_verify_id_,
        "./routes/thumbnail/_middleware.ts": $thumbnail_middleware,
        "./routes/upload.tsx": $upload,
    },
    islands: {
        "./islands/Upload.tsx": $Upload,
    },
    baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
