FROM denoland/deno:latest

ARG DENO_DEPLOYMENT_ID

WORKDIR /app

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

RUN deno task fetch && deno task server-build && mkdir -p ./thumbnails && chmod 777 ./thumbnails && mkdir -p ./downloads && chmod 777 ./downloads
ENV DENO_DEPLOYMENT_ID=${DENO_DEPLOYMENT_ID}

EXPOSE 8000
ENTRYPOINT deno task server

HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
    CMD curl -Lk -fsS http://localhost:8000/api/health_check || exit 1
