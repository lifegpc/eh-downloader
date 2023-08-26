#include "thumbnail.h"
#include "cfileop.h"
#include "libavformat/avformat.h"
#include "libavcodec/avcodec.h"
#include "libswscale/swscale.h"
#include <string.h>

PUBLIC_API void thumbnail_fferror(int e, char* buf, size_t bufsize) {
    if (!buf) return;
    av_make_error_string(buf, bufsize, e);
}

int thumbnail_convert_frame(THUMBNAIL_ERROR* err, AVFrame* ifr, AVFrame** ofr, AVCodecContext* occ, THUMBNAIL_METHOD method) {
    if (!err || !ifr || !ofr) return 1;
    int re = 0;
    struct SwsContext* sws = NULL;
    AVFrame* fr = NULL, * fr2 = NULL;
    if (!(fr = av_frame_alloc())) {
        err->e = THUMBNAIL_OOM;
        re = 1;
        goto end;
    }
    int theight = ifr->height * occ->width / ifr->width;
    char simple_way = 0;
    if (occ->height == theight || method == THUMBNAIL_FILL) {
        simple_way = 1;
    }
    if (simple_way) {
        fr->width = occ->width;
        fr->height = occ->height;
        fr->format = occ->pix_fmt;
        fr->sample_aspect_ratio = ifr->sample_aspect_ratio;
    }
    if ((err->fferr = av_frame_get_buffer(fr, 0)) < 0) {
        err->e = THUMBNAIL_FFMPEG_ERROR;
        re = 1;
        av_log(NULL, AV_LOG_ERROR, "Failed to get buffer for output frame: %s\n", av_err2str(err->fferr));
        goto end;
    }
    if ((err->fferr = av_frame_make_writable(fr)) < 0) {
        err->e = THUMBNAIL_FFMPEG_ERROR;
        re = 1;
        av_log(NULL, AV_LOG_ERROR, "Failed to make writeable for output frame: %s\n", av_err2str(err->fferr));
        goto end;
    }
    if (simple_way) {
        if (!(sws = sws_getContext(ifr->width, ifr->height, (enum AVPixelFormat)ifr->format, fr->width, fr->height, (enum AVPixelFormat)fr->format, SWS_BILINEAR, NULL, NULL, NULL))) {
            err->e = THUMBNAIL_UNABLE_SCALE;
            re = 1;
            goto end;
        }
        if ((err->fferr = sws_scale(sws, (const uint8_t* const*)ifr->data, ifr->linesize, 0, ifr->height, fr->data, fr->linesize)) < 0) {
            err->e = THUMBNAIL_UNABLE_SCALE;
            re = 1;
            goto end;
        }
    }
end:
    if (re == 1 && fr) av_frame_free(&fr);
    else if (re == 0) *ofr = fr;
    if (fr2) av_frame_free(&fr2);
    if (sws) sws_freeContext(sws);
    return re;
}

int thumbnail_encode_video(THUMBNAIL_ERROR* err, AVFrame* ofr, AVFormatContext* oc, AVCodecContext* occ, char* writed_data) {
    if (!err || !oc || !occ || !writed_data) return 1;
    int re = 0;
    AVPacket* pkt = av_packet_alloc();
    if (!pkt) {
        err->e = THUMBNAIL_OOM;
        re = 1;
        goto end;
    }
    *writed_data = 0;
    if (ofr) {
        ofr->pts = 0;
        ofr->pkt_dts = 0;
    }
    if ((err->fferr = avcodec_send_frame(occ, ofr)) < 0) {
        if (err->fferr == AVERROR_EOF) {
            err->fferr = 0;
        } else {
            av_log(NULL, AV_LOG_ERROR, "Failed to send frame to encoder: %s\n", av_err2str(err->fferr));
            err->e = THUMBNAIL_FFMPEG_ERROR;
            re = 1;
            goto end;
        }
    }
    err->fferr = avcodec_receive_packet(occ, pkt);
    if (err->fferr >= 0) {
        *writed_data = 1;
    } else if (err->fferr == AVERROR_EOF || err->fferr == AVERROR(EAGAIN)) {
        err->fferr = 0;
        goto end;
    } else {
        av_log(NULL, AV_LOG_ERROR, "Failed to recive data from encoder: %s\n", av_err2str(err->fferr));
        err->e = THUMBNAIL_FFMPEG_ERROR;
        re = 1;
        goto end;
    }
    if (*writed_data && pkt) {
        pkt->stream_index = 0;
        if ((err->fferr = av_write_frame(oc, pkt)) < 0) {
            err->e = THUMBNAIL_FFMPEG_ERROR;
            av_log(NULL, AV_LOG_ERROR, "Failed to write data to muxer: %s\n", av_err2str(err->fferr));
            re = 1;
            goto end;
        }
    }
end:
    if (pkt) av_packet_free(&pkt);
    return re;
}

THUMBNAIL_ERROR gen_thumbnail(const char* src, const char* dest, int width, int height, THUMBNAIL_METHOD method) {
    THUMBNAIL_ERROR re = { THUMBNAIL_OK, 0 };
    AVFormatContext* ic = NULL, * oc = NULL;
    AVStream* is = NULL, * os = NULL;
    const AVCodec* input_codec = NULL, * output_codec = NULL;
    AVCodecContext* icc = NULL, * occ = NULL;
    AVPacket pkt;
    AVFrame* ifr = NULL, * ofr = NULL;
    if (method < THUMBNAIL_COVER || method > THUMBNAIL_FILL) {
        re.e = THUMBNAIL_UNKNOWN_METHOD;
        goto end;
    }
    if (!src || !dest) {
        re.e = THUMBNAIL_NULL_POINTER;
        goto end;
    }
    if (fileop_exists(dest)) {
        if (!fileop_remove(dest)) {
            re.e = THUMBNAIL_REMOVE_OUTPUT_FILE_FAILED;
            goto end;
        }
    }
    if ((re.fferr = avformat_open_input(&ic, src, NULL, NULL)) < 0) {
        re.e = THUMBNAIL_FFMPEG_ERROR;
        av_log(NULL, AV_LOG_ERROR, "Failed to open file: %s\n", av_err2str(re.fferr));
        goto end;
    }
    if ((re.fferr = avformat_find_stream_info(ic, NULL)) < 0) {
        re.e = THUMBNAIL_FFMPEG_ERROR;
        av_log(NULL, AV_LOG_ERROR, "Failed to find stream info in file: %s\n", av_err2str(re.fferr));
        goto end;
    }
    for (unsigned int i = 0; i < ic->nb_streams; i++) {
        AVStream* s = ic->streams[i];
        if (s->codecpar && s->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
            is = s;
            break;
        }
    }
    if (!is) {
        re.e = THUMBNAIL_NO_VIDEO_STREAM;
        goto end;
    }
    if ((re.fferr = avformat_alloc_output_context2(&oc, NULL, "mjpeg", dest)) < 0) {
        av_log(NULL, AV_LOG_ERROR, "Failed to allocate output context: %s\n", av_err2str(re.fferr));
        re.e = THUMBNAIL_FFMPEG_ERROR;
        goto end;
    }
    if (!(input_codec = avcodec_find_decoder(is->codecpar->codec_id))) {
        re.e = THUMBNAIL_NO_DECODER;
        goto end;
    }
    if (!(icc = avcodec_alloc_context3(input_codec))) {
        re.e = THUMBNAIL_OOM;
        goto end;
    }
    if ((re.fferr = avcodec_parameters_to_context(icc, is->codecpar)) < 0) {
        av_log(NULL, AV_LOG_ERROR, "Failed to copy decode parameters: %s\n", av_err2str(re.fferr));
        re.e = THUMBNAIL_FFMPEG_ERROR;
        goto end;
    }
    if ((re.fferr = avcodec_open2(icc, input_codec, NULL)) < 0) {
        av_log(NULL, AV_LOG_ERROR, "Failed to open decoder: %s\n", av_err2str(re.fferr));
        re.e = THUMBNAIL_FFMPEG_ERROR;
        goto end;
    }
    output_codec = avcodec_find_encoder(AV_CODEC_ID_MJPEG);
    if (!output_codec) {
        re.e = THUMBNAIL_NO_ENCODER;
        goto end;
    }
    if (!(occ = avcodec_alloc_context3(output_codec))) {
        re.e = THUMBNAIL_OOM;
        goto end;
    }
    occ->width = width;
    occ->height = height;
    occ->pix_fmt = AV_PIX_FMT_YUVJ420P;
    occ->sample_aspect_ratio = icc->sample_aspect_ratio;
    occ->time_base = AV_TIME_BASE_Q;
    occ->color_range = AVCOL_RANGE_JPEG;
    if ((re.fferr = avcodec_open2(occ, output_codec, NULL)) < 0) {
        av_log(NULL, AV_LOG_ERROR, "Failed to open encoder: %s\n", av_err2str(re.fferr));
        re.e = THUMBNAIL_FFMPEG_ERROR;
        goto end;
    }
    if (!(os = avformat_new_stream(oc, NULL))) {
        re.e = THUMBNAIL_OOM;
        goto end;
    }
    if ((re.fferr = avcodec_parameters_from_context(os->codecpar, occ)) < 0) {
        av_log(NULL, AV_LOG_ERROR, "Failed to copy encoder's params to muxer: %s\n", av_err2str(re.fferr));
        re.e = THUMBNAIL_FFMPEG_ERROR;
        goto end;
    }
    if (!(oc->oformat->flags & AVFMT_NOFILE)) {
        if ((re.fferr = avio_open(&oc->pb, dest, AVIO_FLAG_WRITE)) < 0) {
            av_log(NULL, AV_LOG_ERROR, "Failed to open output file: %s\n", av_err2str(re.fferr));
            re.e = THUMBNAIL_FFMPEG_ERROR;
            goto end;
        }
    }
    if ((re.fferr = avformat_write_header(oc, NULL)) < 0) {
        av_log(NULL, AV_LOG_ERROR, "Failed to write headers to file: %s\n", av_err2str(re.fferr));
        re.e = THUMBNAIL_FFMPEG_ERROR;
        goto end;
    }
    while (1) {
        if ((re.fferr = av_read_frame(ic, &pkt)) < 0) {
            av_log(NULL, AV_LOG_ERROR, "Failed to read frames from file: %s\n", av_err2str(re.fferr));
            re.e = THUMBNAIL_FFMPEG_ERROR;
            goto end;
        }
        if (pkt.data == NULL) {
            av_packet_unref(&pkt);
            av_log(NULL, AV_LOG_ERROR, "No data find in frames: %s\n", av_err2str(re.fferr));
            re.e = THUMBNAIL_FFMPEG_ERROR;
            goto end;
        }
        if (pkt.stream_index != is->index) {
            av_packet_unref(&pkt);
            continue;
        }
        if (!(ifr = av_frame_alloc())) {
            av_packet_unref(&pkt);
            re.e = THUMBNAIL_OOM;
            goto end;
        }
        if ((re.fferr = avcodec_send_packet(icc, &pkt)) < 0) {
            av_packet_unref(&pkt);
            av_log(NULL, AV_LOG_ERROR, "Failed to send packet to decoder: %s\n", av_err2str(re.fferr));
            re.e = THUMBNAIL_FFMPEG_ERROR;
            goto end;
        }
        if ((re.fferr = avcodec_receive_frame(icc, ifr)) < 0) {
            if (re.fferr == AVERROR(EAGAIN)) {
                av_packet_unref(&pkt);
                re.fferr = 0;
                continue;
            }
            av_packet_unref(&pkt);
            av_log(NULL, AV_LOG_ERROR, "Failed to receive frame from decoder: %s\n", av_err2str(re.fferr));
            re.e = THUMBNAIL_FFMPEG_ERROR;
            goto end;
        }
        if (thumbnail_convert_frame(&re, ifr, &ofr, occ, method)) {
            av_packet_unref(&pkt);
            re.e = THUMBNAIL_FFMPEG_ERROR;
            goto end;
        }
        char writed = 0;
        if (thumbnail_encode_video(&re, ofr, oc, occ, &writed)) {
            av_packet_unref(&pkt);
            goto end;
        }
        while (1) {
            if (thumbnail_encode_video(&re, NULL, oc, occ, &writed)) {
                av_packet_unref(&pkt);
                goto end;
            }
            if (!writed) break;
        }
        av_packet_unref(&pkt);
        break;
    }
    av_write_trailer(oc);
end:
    if (ifr) av_frame_free(&ifr);
    if (ofr) av_frame_free(&ofr);
    if (icc) avcodec_free_context(&icc);
    if (occ) avcodec_free_context(&occ);
    if (oc) {
        if (!(oc->oformat->flags & AVFMT_NOFILE)) avio_closep(&oc->pb);
        avformat_free_context(oc);
    }
    if (ic) avformat_close_input(&ic);
    return re;
}

const char* thumbnail_berror(THUMBNAIL_ERROR_E e) {
    switch (e) {
    case THUMBNAIL_OK:
        return "OK";
    case THUMBNAIL_FFMPEG_ERROR:
        return "A error occured in ffmpeg code.";
    case THUMBNAIL_NULL_POINTER:
        return "Arguments have null pointers.";
    case THUMBNAIL_REMOVE_OUTPUT_FILE_FAILED:
        return "Can not remove output file.";
    case THUMBNAIL_NO_VIDEO_STREAM:
        return "Can not find video stream in source file.";
    case THUMBNAIL_OOM:
        return "Out of memory.";
    case THUMBNAIL_NO_DECODER:
        return "No available decoder.";
    case THUMBNAIL_NO_ENCODER:
        return "No available encoder.";
    case THUMBNAIL_UNABLE_SCALE:
        return "Unable to scale image.";
    default:
        return "Unknown error.";
    }
}

void thumbnail_error(THUMBNAIL_ERROR e, char* buf, size_t bufsize) {
    switch (e.e) {
    case THUMBNAIL_FFMPEG_ERROR:
        thumbnail_fferror(e.fferr, buf, bufsize);
        break;
    default:
        strncpy(buf, thumbnail_berror(e.e), bufsize);
        break;
    }
}
