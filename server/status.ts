export type StatusData = {
    ffmpeg_binary_enabled: boolean;
    meilisearch_enabled: boolean;
    meilisearch?: {
        host: string;
        key: string;
    };
    no_user: boolean;
};
