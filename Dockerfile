# One image: the Go server serves the API and the built React page on :8080.

FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM golang:1.24-alpine AS api
WORKDIR /src
COPY backend/ ./
RUN go test ./internal/domain/... && CGO_ENABLED=0 go build -o /server .

FROM alpine:3.20
WORKDIR /app
COPY --from=api /server ./server
COPY --from=web /web/dist ./web
COPY data/ ./data/
EXPOSE 8080
CMD ["./server", "-addr", ":8080", "-data", "data/data.json", "-geo", "data/regions.geojson", "-static", "web"]
