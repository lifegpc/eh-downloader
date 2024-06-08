#pragma once

#include <stddef.h>
#if _WIN32
#define PUBLIC_API __declspec(dllexport)
#elif defined(__GNUC__)
#define PUBLIC_API __attribute__((visibility("default")))
#else
#define PUBLIC_API 
#endif

typedef enum THUMBNAIL_ERROR_E {
    THUMBNAIL_OK,
    THUMBNAIL_NULL_POINTER,
    THUMBNAIL_REMOVE_OUTPUT_FILE_FAILED,
    THUMBNAIL_FFMPEG_ERROR,
    THUMBNAIL_NO_VIDEO_STREAM,
    THUMBNAIL_UNKNOWN_METHOD,
    THUMBNAIL_NO_DECODER,
    THUMBNAIL_OOM,
    THUMBNAIL_NO_ENCODER,
    THUMBNAIL_UNABLE_SCALE,
    THUMBNAIL_UNKNOWN_ALIGN,
} THUMBNAIL_ERROR_E;

typedef struct THUMBNAIL_ERROR {
    THUMBNAIL_ERROR_E e;
    int fferr;
}THUMBNAIL_ERROR;

typedef enum THUMBNAIL_METHOD {
    THUMBNAIL_COVER = 1,
    THUMBNAIL_CONTAIN,
    THUMBNAIL_FILL,
} THUMBNAIL_METHOD;

typedef enum ALIGN_METHOD {
    ALIGN_LEFT,
    ALIGN_TOP = 0,
    ALIGN_CENTER,
    ALIGN_RIGHT,
    ALIGN_BOTTOM = 2,
} ALIGN_METHOD;

PUBLIC_API THUMBNAIL_ERROR gen_thumbnail(const char* src, const char* dest, int width, int height, THUMBNAIL_METHOD method, ALIGN_METHOD align, int quality);
PUBLIC_API void thumbnail_error(THUMBNAIL_ERROR e, char* buf, size_t bufsize);
