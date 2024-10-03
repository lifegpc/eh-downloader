# EH Downloader

## How to start server

```shell
curl -L "https://github.com/lifegpc/eh-downloader/raw/master/docker-compose.yml" -o docker-compose.yml
docker compose up -d
```

API Document is available [here](https://ehapi.lifegpc.com/).

## Official Frontend

- [Flutter frontend](https://github.com/lifegpc/eh_downloader_flutter)

## FFI Extensions

All dynamic libraries should place in `./lib` directory.

### Thumbnail

- Required tools: `cmake`, C/C++ compiler.
- Required library: `libavformat`, `libavcodec`, `libavutil`, `libswscale`.

#### Location

- `./lib/thumbnail.dll` on Windows.
- `./lib/libthumbnail.so` on Linux.
- `./lib/libthumbnail.dylib` on macOS.
