# Builder
FROM golang:1.25-alpine AS builder
RUN apk add --no-cache git ca-certificates tzdata
WORKDIR /app

# Separate phase for downloading dependencies to leverage caching
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o indexer ./cmd/indexer

# Runner
FROM alpine:latest AS runner
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

RUN adduser -D -s /bin/sh appuser

COPY --from=builder /app/indexer .

RUN chown appuser:appuser /root/indexer
USER appuser

CMD ["./indexer"]