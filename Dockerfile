# One image: the Go server serves the API and the built React page on :8080.

FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# The page reads VITE_* settings from ../.env at build time. Use .env if it
# exists, otherwise the committed template.
COPY .env* /envs/
RUN if [ -f /envs/.env ]; then cp /envs/.env /.env; else cp /envs/.env.example /.env; fi
RUN npm run build

FROM golang:1.24-alpine AS api
WORKDIR /src
COPY backend/ ./
RUN go test ./internal/domain/... ./internal/config/... && CGO_ENABLED=0 go build -o /server .

FROM alpine:3.20
WORKDIR /app
COPY --from=api /server ./server
COPY --from=web /web/dist ./web
COPY data/ ./data/
# Paths inside the image differ from a local checkout, so they are set here.
ENV SERVER_ADDR=:8080 DATA_FILE=data/data.json REGIONS_FILE=data/regions.geojson STATIC_DIR=web
EXPOSE 8080
CMD ["./server"]
