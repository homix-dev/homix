# Build stage
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git

WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the edge server
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o edge ./cmd/edge

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/edge .

# Copy default config
COPY --from=builder /build/config/edge.yaml /config/edge.yaml

# Create data directory
RUN mkdir -p /data/jetstream /data/automations

# Expose ports
EXPOSE 4222 7422 8222 9222 1883 8080 2112

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8222/healthz || exit 1

# Run as non-root user
RUN adduser -D -s /bin/sh nats
USER nats

ENTRYPOINT ["./edge"]