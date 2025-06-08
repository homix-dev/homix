# NATS Infrastructure Setup

This directory contains the configuration and setup scripts for the NATS messaging infrastructure.

## Quick Start

### Development Mode (Recommended to Start)

No Synadia Cloud account needed:
```bash
# Start NATS in development mode
task infra:start-dev

# Test the connection
task infra:test-connection
```

### Production Mode with Synadia Cloud

1. Follow the guide in `synadia-setup.md` to create a Synadia Cloud account
2. Save credentials as `nats-home-automation.creds` in this directory
3. Start NATS with cloud connection:
```bash
task infra:start
```

## Configuration Options

We provide three configuration modes:

1. **Development** (`nats-server-dev.conf`) - Local only, no external dependencies
2. **Production** (`nats-server.conf`) - Local auth + Synadia Cloud leaf node
3. **Hybrid** (`nats-server-hybrid.conf`) - Advanced setup with multiple auth methods

See [CONFIG.md](CONFIG.md) for detailed configuration documentation.

## Installation Methods

### Using Task (Recommended)

```bash
# Install Task if you haven't already
brew install go-task/tap/go-task  # macOS
# or see https://taskfile.dev/installation/

# Setup and start
task infra:setup
task infra:start-dev  # or start, start-hybrid
```

### Using Docker Compose Directly

```bash
# Development mode
NATS_CONFIG=nats-server-dev.conf docker-compose up -d

# Production mode (default)
docker-compose up -d
```

### Manual Docker Setup

```bash
docker run -d \
  --name nats-home-automation \
  -p 4222:4222 \
  -p 8222:8222 \
  -v $(pwd)/nats-server-dev.conf:/etc/nats/nats-server.conf \
  -v $(pwd)/data:/data \
  nats:2.11 -c /etc/nats/nats-server.conf
```

## Testing Your Setup

### Quick Test
```bash
task infra:test-connection
```

### Manual Testing

Test server connection:
```bash
nats --server=nats://localhost:4222 --user=home --password=changeme server check connection
```

Test pub/sub:
```bash
# Terminal 1 - Subscribe
nats --server=nats://localhost:4222 --user=home --password=changeme sub "home.>"

# Terminal 2 - Publish
echo "Hello NATS!" | nats --server=nats://localhost:4222 --user=home --password=changeme pub home.test
```

### NATS CLI Installation

**macOS:**
```bash
brew install nats-io/nats-tools/nats
```

**Linux:**
```bash
curl -sf https://binaries.nats.dev/nats-io/natscli/nats@latest | sh
```

**Go Install:**
```bash
go install github.com/nats-io/natscli/nats@latest
```

## Default Credentials

⚠️ **Change these for production!**

### Development Mode
- User: `home`
- Password: `changeme`

### Admin Access
- User: `admin`
- Password: `admin` (dev) or `admin-changeme` (prod)

## JetStream Setup

JetStream is enabled by default. Create streams and KV stores:

```bash
# Create device events stream
task infra:create-streams

# Or manually:
nats --server=nats://localhost:4222 --user=home --password=changeme \
  stream add HOME_EVENTS \
  --subjects="home.devices.>" \
  --storage=file \
  --retention=limits

# Create KV stores
nats --server=nats://localhost:4222 --user=home --password=changeme kv add devices
nats --server=nats://localhost:4222 --user=home --password=changeme kv add device-configs
```

## Monitoring

### Web Dashboard
Open http://localhost:8222 in your browser

### CLI Monitoring
```bash
# Server info
nats --server=nats://localhost:4222 --user=home --password=changeme server report

# Stream info
nats --server=nats://localhost:4222 --user=home --password=changeme stream ls

# Connection info
nats --server=nats://localhost:4222 --user=home --password=changeme server report connections
```

## Useful Commands

```bash
# View logs
task infra:logs

# Restart server
task infra:restart

# Stop server
task infra:stop

# Clean all data (WARNING: destructive!)
task infra:clean

# Backup JetStream data
task infra:backup

# Open shell in container
task infra:shell
```

## Troubleshooting

### Connection Refused
1. Check if NATS is running: `docker ps | grep nats`
2. Verify ports are not in use: `lsof -i :4222`
3. Check logs: `task infra:logs`

### Authentication Failed
1. Verify which config is loaded: `docker logs nats-home-automation | head -20`
2. Use correct credentials for the mode you're running
3. For dev mode: user=`home`, password=`changeme`

### Synadia Cloud Connection Issues
1. Check credentials file exists and is readable
2. Verify leaf node status: `curl http://localhost:8222/leafz`
3. Check connectivity to Synadia: `nats context info`

## Next Steps

Once your infrastructure is running:
1. Run the discovery service: `task services:discovery:run`
2. Start the CLI/TUI: `task tools:cli:run-tui`
3. Configure ESPHome devices with NATS components

See the main [README.md](../README.md) for the complete getting started guide.