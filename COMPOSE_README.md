# Docker Compose Setup for NATS Home Automation

This project provides Docker Compose configurations to easily run all NATS Home Automation services with a single command.

## Available Configurations

### 1. Basic Setup (Without Home Assistant)
- **File**: `docker-compose.yml`
- **Services**: NATS Server, Discovery Service, Management UI, Health Monitor
- **Use Case**: Development, testing, or when using external Home Assistant

### 2. Full Setup (With Home Assistant)
- **File**: `docker-compose.full.yml`
- **Services**: All basic services + Home Assistant, MQTT Broker, MQTT-NATS Bridge
- **Use Case**: Complete home automation setup
- **Optional**: Zigbee2MQTT support (requires Zigbee adapter)

## Quick Start

### Basic Setup

```bash
# Start all core services
task compose:up

# View logs
task compose:logs

# Stop all services
task compose:down
```

### Full Setup with Home Assistant

```bash
# Start all services including Home Assistant
task compose:up:full

# View logs
task compose:logs:full

# Stop all services
task compose:down:full
```

### With Zigbee Support

```bash
# First, edit .env file to set your Zigbee device (e.g., /dev/ttyUSB0)
cp .env.example .env
# Edit .env and set ZIGBEE_DEVICE

# Start with Zigbee2MQTT
task compose:up:zigbee
```

## Service URLs

Once started, services are available at:

- **NATS Server**: nats://localhost:4222 (auth: home/changeme)
- **Management UI**: http://localhost:8081 (login: admin/admin)
- **Health Monitor**: http://localhost:8082
- **NATS Monitor**: http://localhost:8222
- **Home Assistant**: http://localhost:8123 (full setup only)
- **Zigbee2MQTT**: http://localhost:8080 (when enabled)

## Common Tasks

### Build Images
```bash
# Build all service images
task compose:build

# Build for full setup
task compose:build:full
```

### View Service Status
```bash
task compose:ps
```

### Restart a Service
```bash
# Restart specific service
task compose:restart SERVICE=management-ui
```

### Execute Commands in Container
```bash
# Open shell in NATS container
task compose:exec SERVICE=nats CMD=sh

# Run NATS CLI in container
task compose:exec SERVICE=nats-box CMD="nats --help"
```

## Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Key variables:
- `TZ`: Timezone (default: America/New_York)
- `CONTAINER_TOOL`: docker or podman
- `ZIGBEE_DEVICE`: Path to Zigbee adapter (e.g., /dev/ttyUSB0)

## Troubleshooting

### Services not starting
1. Check logs: `task compose:logs`
2. Ensure ports are not in use: 4222, 8081, 8082, 8222, 8123
3. Verify Docker/Podman is running

### NATS connection issues
1. Wait a few seconds after starting for services to initialize
2. Check NATS health: `curl http://localhost:8222/healthz`
3. Verify credentials in services match NATS config

### Home Assistant setup
1. First start creates config in `./homeassistant-config/`
2. Complete onboarding at http://localhost:8123
3. Add NATS Bridge integration via UI

## Development Mode

For development with hot-reload, run services individually:

```bash
# Terminal 1 - NATS
task infra:start-dev

# Terminal 2 - Discovery Service
task services:discovery:run

# Terminal 3 - Management UI
task services:ui:run

# Terminal 4 - Health Monitor
task services:health:run
```

Or use tmux:
```bash
task dev:tmux
```

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│   Management    │     │    Health    │     │  Discovery   │
│       UI        │────▶│   Monitor    │────▶│   Service    │
└────────┬────────┘     └──────┬───────┘     └──────┬───────┘
         │                     │                      │
         └─────────────────────┴──────────────────────┘
                               │
                        ┌──────▼───────┐
                        │     NATS     │
                        │    Server    │
                        └──────┬───────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼─────┐        ┌──────▼───────┐     ┌──────▼───────┐
    │   Home   │        │     MQTT     │     │   ESP/IoT    │
    │Assistant │        │    Bridge    │     │   Devices    │
    └──────────┘        └──────────────┘     └──────────────┘
```

## Security Notes

1. Default credentials are for development only
2. Change passwords in production:
   - NATS: Update in `infrastructure/nats-server-dev.conf`
   - Management UI: Currently uses hardcoded admin/admin
3. Use TLS certificates for production NATS deployments
4. Restrict network access in production environments

## Contributing

When adding new services:
1. Create Dockerfile in service directory
2. Add service to appropriate docker-compose file
3. Update this README with new service details
4. Add corresponding task commands in Taskfile.yaml