FROM denoland/deno:latest as builder
RUN apt-get update && apt-get install -y \
    gcc \
    'g++' \
    cmake \
    nasm \
    git \
    zlib1g-dev \
    pkgconf \
    clang \
    autoconf \
    automake \
    autotools-dev \
    libtool \
    xutils-dev \
    ca-certificates \
    curl \
    file \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN cd ~ && \
    curl -L "https://github.com/FFmpeg/FFmpeg/archive/refs/tags/n6.1.1.tar.gz" -o ffmpeg.tar.gz && \
    tar -xzvf ffmpeg.tar.gz && \
    cd FFmpeg-n6.1.1 && \
    ./configure --enable-pic --prefix=/clib --enable-shared --disable-static \
    --enable-gpl --enable-version3 --disable-doc --disable-ffplay \
    --disable-network --disable-autodetect --enable-zlib \
    --disable-encoders --enable-encoder=mjpeg \
    --disable-muxers --enable-muxer=image2,image2pipe \
    --disable-decoders --enable-decoder=mjpeg,png,gif \
    --disable-demuxers --enable-demuxer=image_jpeg_pipe,image_png_pipe,image_gif_pipe \
    --disable-parsers --enable-parser=h264,png,gif \
    --disable-bsfs --enable-bsf=dts2pts,null \
    --disable-protocols --enable-protocol=async,concat,concatf,data,fd,file,md5,pipe,subfile \
    --disable-devices --disable-filters --enable-filter=scale && \
    make -j$(grep -c ^processor /proc/cpuinfo) && make install && \
    cd ~ && rm -rf FFmpeg-n6.1.1 ffmpeg.tar.gz

FROM denoland/deno:latest as prod

ARG DENO_DEPLOYMENT_ID

WORKDIR /app

COPY --from=builder /clib/lib /app/lib
COPY --from=builder /clib/bin /app/bin
COPY ./components ./components
COPY ./islands ./islands
COPY ./page ./page
COPY ./routes ./routes
COPY ./server ./server
COPY ./static/*.css ./static/
COPY ./static/*.ts ./static/
COPY ./static/*.ico ./static/
COPY ./static/*.svg ./static/
COPY ./tasks ./tasks
COPY ./thumbnail ./thumbnail
COPY ./translation ./translation
COPY ./utils ./utils
COPY ./*.ts ./
COPY ./deno.json ./
COPY ./import_map.json ./
COPY ./LICENSE ./

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

ENV LD_LIBRARY_PATH=/app/lib
ENV PATH=/app/bin:$PATH

RUN deno task fetch && deno task server-build && mkdir -p ./thumbnails && chmod 777 ./thumbnails && mkdir -p ./downloads && chmod 777 ./downloads
ENV DENO_DEPLOYMENT_ID=${DENO_DEPLOYMENT_ID}
ENV DOCKER=1

EXPOSE 8000
ENTRYPOINT deno task server

HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
    CMD curl -Lk -fsS http://localhost:8000/api/health_check || exit 1
