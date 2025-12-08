# Builder
FROM golang:1.25-alpine AS builder
RUN apk add --no-cache git ca-certificates tzdata gcc musl-dev pkgconfig

WORKDIR /app

# Separate phase for downloading dependencies to leverage caching
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o waveforms ./cmd/waveforms

# Runner
FROM alpine:latest AS runner
RUN apk --no-cache add ca-certificates tzdata libc6-compat ffmpeg
WORKDIR /root/

RUN adduser -D -s /bin/sh appuser

COPY --from=builder /app/waveforms .

RUN chown appuser:appuser /root/waveforms
USER appuser

# Command to run
CMD ["./waveforms"]