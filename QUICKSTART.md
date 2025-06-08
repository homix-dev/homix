# NATS Home Automation - Quick Start Guide

## Prerequisites

- Go 1.21+ (for building services)
- Docker or Podman (for running NATS)
- Python 3.8+ (optional, for ESPHome integration)

## Quick Start

### 1. Check Dependencies

```bash
task check-deps
```

### 2. Setup Development Environment

```bash
# Install dependencies and start NATS
task setup-dev
```

### 3. Run Everything

```bash
# Start all services in development mode
task dev

# Or start services individually
task start
```

## Testing the System

### Send a Test Device Announcement

```bash
task announce-test
```

### Monitor All Messages

```bash
task monitor
```

### List Registered Devices

```bash
task devices-list
```

## Installing Binaries

### Install to /usr/local/bin

```bash
# Install all binaries
task install

# Or install individually
task services:discovery:install
task tools:cli:install
```

After installation, you can run:
- `discovery-service` - Device discovery and registry service
- `nats-ha` - CLI tool for managing NATS home automation

### System Service Installation

For Linux (systemd):
```bash
task services:discovery:install-service
```

For macOS (launchd):
```bash
task services:discovery:install-service-macos
```

## Using the Tools

### CLI Tool

```bash
# If installed globally
nats-ha device list
nats-ha device get esp32-kitchen-001
nats-ha config set esp32-kitchen-001 '{"update_interval": 30}'
nats-ha tui

# Or run from source
task tools:cli:run -- device list
task tools:cli:run -- device get esp32-kitchen-001
task tools:cli:run -- config set esp32-kitchen-001 '{"update_interval": 30}'
```

### TUI (Terminal UI)

```bash
# If installed globally
nats-ha tui

# Or run from source
task tools:tui:run
```

## Common Issues

### Docker/Podman Issues

If Docker isn't running but Podman is available:

```bash
export CONTAINER_TOOL=podman
```

### Connection Issues

Default connection details:
- URL: `nats://localhost:4222`
- User: `home`
- Password: `changeme`

### Python Dependencies

If pip isn't found:

```bash
# macOS
brew install python3

# Ubuntu/Debian
sudo apt install python3-pip

# Then install dependencies
pip3 install --user nats-py
```

## Development Workflow

### Start Services

```bash
task start        # Start all services
task stop         # Stop all services
task restart      # Restart services
```

### Monitor Logs

```bash
task infra:logs   # NATS server logs
```

### Run Tests

```bash
task test         # Run all tests
task services:discovery:test  # Test discovery service
```

## Next Steps

1. Deploy ESPHome devices with NATS components
2. Set up Home Assistant with MQTT-NATS bridge
3. Create custom automations using the NATS messaging patterns

See [docs/](docs/) for detailed documentation.