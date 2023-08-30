# EH Downloader

## How to start server

### One Time Setup

```powershell
git clone "https://github.com/lifegpc/eh-downloader.git"
cd eh-downloader
# Fetch static files from node_modules. These files are used in frontend.
deno task fetch
# Optional. This will enable release mode for fresh.
$env:DENO_DEPLOYMENT_ID="$(git rev-parse HEAD)"
# Optional. Prebuild islands.
deno task server-build
```

### Start Server

```powershell
cd eh-downloader
# Optional. This will enable release mode for fresh.
$env:DENO_DEPLOYMENT_ID="$(git rev-parse HEAD)"
# Start server
deno task server
```

Now dashboard is available at `http://localhost:8000/`.

## other frontend

- [Flutter frontend](https://github.com/lifegpc/eh_downloader_flutter)
