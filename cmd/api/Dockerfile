# Builder
FROM golang:1.25-alpine AS builder
RUN apk add --no-cache git ca-certificates tzdata
WORKDIR /app

# Separate phase for downloading dependencies to leverage caching
COPY go.mod go.sum ./
RUN go mod download

# Only copy Go source files, not web directory
COPY pkg/ pkg/
COPY cmd/ cmd/
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o api ./cmd/api

# Runner
FROM alpine:latest AS runner
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

RUN adduser -D -s /bin/sh appuser

COPY --from=builder /app/api .

RUN chown appuser:appuser /root/api
USER appuser

EXPOSE 8080

CMD ["./api"]