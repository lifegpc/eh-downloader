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
    perl \
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

RUN cd ~ && \
    curl -L "https://github.com/curl/curl/releases/download/curl-8_5_0/curl-8.5.0.tar.gz" -o curl-8.5.0.tar.gz && \
    tar -xzvf curl-8.5.0.tar.gz && \
    cd curl-8.5.0 && \
    mkdir build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release -DCURL_DISABLE_ALTSVC=ON -DCURL_DISABLE_SRP=ON \
    -DCURL_DISABLE_COOKIES=ON -DCURL_DISABLE_BASIC_AUTH=ON -DCURL_DISABLE_BEARER_AUTH=ON \
    -DCURL_DISABLE_DIGEST_AUTH=ON -DCURL_DISABLE_KERBEROS_AUTH=ON -DCURL_DISABLE_NEGOTIATE_AUTH=ON \
    -DCURL_DISABLE_AWS=ON -DCURL_DISABLE_DICT=ON -DCURL_DISABLE_DOH=ON -DCURL_DISABLE_FILE=ON \
    -DCURL_DISABLE_FORM_API=ON -DCURL_DISABLE_FTP=ON -DCURL_DISABLE_GETOPTIONS=ON \
    -DCURL_DISABLE_GOPHER=ON -DCURL_DISABLE_HEADERS_API=ON -DCURL_DISABLE_HSTS=ON \
    -DCURL_DISABLE_HTTP_AUTH=ON -DCURL_DISABLE_IMAP=ON -DCURL_DISABLE_LDAP=ON \
    -DCURL_DISABLE_LDAPS=ON -DCURL_DISABLE_LIBCURL_OPTION=ON -DCURL_DISABLE_MQTT=ON \
    -DCURL_DISABLE_NETRC=ON -DCURL_DISABLE_NTLM=ON -DCURL_DISABLE_POP3=ON \
    -DCURL_DISABLE_PROXY=ON -DCURL_DISABLE_RTSP=ON -DCURL_DISABLE_SMB=ON \
    -DCURL_DISABLE_SMTP=ON -DCURL_DISABLE_TELNET=ON -DCURL_DISABLE_TFTP=ON \
    -DUSE_MANUAL=OFF -DCURL_ENABLE_SSL=OFF -DUSE_LIBIDN2=ON -DCURL_USE_LIBPSL=OFF \
    -DCURL_USE_LIBSSH2=OFF -DCMAKE_INSTALL_PREFIX=/clib ../ && \
    make -j$(grep -c ^processor /proc/cpuinfo) && make install && \
    cd ~ && rm -rf curl-8.5.0 curl-8.5.0.tar.gz

RUN cd ~ && \
    curl -L "https://www.sqlite.org/snapshot/sqlite-snapshot-202401231504.tar.gz" -o sqlite-snapshot-202401231504.tar.gz && \
    tar -xzvf sqlite-snapshot-202401231504.tar.gz && \
    cd sqlite-snapshot-202401231504 && \
    ./configure --prefix=/clib --enable-shared --disable-static && \
    make -j$(grep -c ^processor /proc/cpuinfo) && make install && \
    cd ~ && rm -rf sqlite-snapshot-202401231504 sqlite-snapshot-202401231504.tar.gz

FROM denoland/deno:latest as prod

ARG DENO_DEPLOYMENT_ID

WORKDIR /app

COPY --from=builder /clib/lib /app/lib
COPY --from=builder /clib/bin /app/bin
COPY ./components ./components
COPY ./islands ./islands
COPY ./page ./page
COPY ./routes ./routes
COPY ./scripts ./scripts
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

ENV LD_LIBRARY_PATH=/app/lib
ENV PATH=/app/bin:$PATH

RUN deno task fetch && deno task server-build && deno task prebuild && \
    deno task cache && rm -rf ~/.cache && \
    mkdir -p ./thumbnails && chmod 777 ./thumbnails && \
    mkdir -p ./downloads && chmod 777 ./downloads && \
    mkdir -p ./data && chmod 777 ./data && chmod 777 /deno-dir
ENV DENO_DEPLOYMENT_ID=${DENO_DEPLOYMENT_ID}
ENV DOCKER=true
ENV DB_USE_FFI=true
ENV DENO_SQLITE_PATH=/app/lib/libsqlite3.so

EXPOSE 8000
ENTRYPOINT ["/tini", "--", "deno", "task", "server"]

HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
    CMD curl -Lk -fsS http://localhost:8000/api/health_check || exit 1
