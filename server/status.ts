export type StatusData = {
    ffmpeg_api_enabled: boolean;
    ffmpeg_binary_enabled: boolean;
    ffprobe_binary_enabled: boolean;
    meilisearch_enabled: boolean;
    meilisearch?: {
        host: string;
        key: string;
    };
    no_user: boolean;
    is_docker: boolean;
};
