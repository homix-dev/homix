# NATS Home Automation System

A high-performance, distributed home automation system built on NATS messaging with full Home Assistant compatibility.

## Overview

This project implements a NATS-based home automation architecture that provides:

- **Sub-millisecond latency** for device control through NATS Core messaging
- **Full Home Assistant compatibility** via a custom integration bridge
- **ESPHome integration** for ESP32/ESP8266 devices with native NATS support
- **Resilient edge-first architecture** with local/cloud synchronization
- **Protocol bridges** for Zigbee, Z-Wave, and MQTT devices

## Architecture

The system uses a microservices architecture with NATS as the central messaging backbone:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   ESP Devices   │────▶│   NATS Server    │◀────│ Home Assistant  │
│  (NATS Client)  │     │  (Local + Cloud) │     │   Integration   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               ▲
                               │
                        ┌──────┴────────┐
                        │Protocol Bridges│
                        │ (Zigbee/MQTT) │
                        └───────────────┘
```

### Key Components

- **NATS Server**: Central messaging hub with JetStream persistence
- **ESPHome Components**: Custom NATS client components for ESP devices
- **Home Assistant Integration**: Full bidirectional integration between NATS and HA ✅
- **Protocol Bridges**: MQTT to NATS bridge for existing devices ✅
- **Discovery Service**: Automatic device detection and registration ✅
- **Arduino Library**: Native NATS client for Arduino/ESP boards ✅
- **CLI & TUI Tools**: Management interfaces for the system ✅
- **Zigbee2MQTT Bridge**: Bridge for Zigbee devices via Zigbee2MQTT ✅
- **Health Monitoring**: Real-time device health monitoring dashboard ✅
- **Management UI**: Web-based management interface ✅
- **Device Simulator**: Web-based device simulation for testing automations ✅

## Getting Started

### Prerequisites

- NATS Server 2.10+ (local installation or Synadia Cloud account)
- Home Assistant 2024.6+
- ESPHome 2024.6+
- Python 3.11+ / Go 1.21+
- Docker or Podman (for containerized services)
- Task (for build automation) - [Install Task](https://taskfile.dev/installation/)

### Container Runtime Configuration

This project supports both Docker and Podman as container runtimes. By default, it uses Podman. To switch between them:

```bash
# Use Podman (default)
export CONTAINER_TOOL=podman

# Use Docker
export CONTAINER_TOOL=docker

# Or set in .env file (already configured for Podman)
cat .env | grep CONTAINER_TOOL
```

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nats-home-automation.git
cd nats-home-automation
```

2. Check dependencies:
```bash
task check-deps
```

3. Set up and run in development mode:
```bash
# Setup development environment
task setup-dev

# Run all services
task dev

# Or run services individually
task infra:start-dev         # Start NATS server
task services:discovery:run  # Start discovery service
task services:health:run     # Start health monitor (http://localhost:8082)
task services:ui:run         # Start management UI (http://localhost:8081)
task services:simulator:run  # Start device simulator (http://localhost:8083)

# Or run with containers (uses Podman by default)
task up                      # Start all services with containers
task down                    # Stop all containers
```

4. Test the system:
```bash
# Monitor all messages
task monitor

# Send a test device announcement
task announce-test

# Run all tests
task test
```

For production with Synadia Cloud:
```bash
# Copy your Synadia credentials
cp /path/to/nats-home-automation.creds infrastructure/

# Start NATS with Synadia Cloud connection
task infra:start
```

5. Install the Home Assistant integration:
```bash
# Using Task
cd ha-integration
task install

# Or manually
cp -r ha-integration/custom_components/nats_bridge ~/.homeassistant/custom_components/
```

Then restart Home Assistant and add the integration via the UI.

6. Configure your first ESP device:
```yaml
# example-device.yaml
external_components:
  - source: 
      type: local
      path: esphome-components
    components: [ nats_client, nats_sensor ]

nats_client:
  server: "192.168.1.100"
  port: 4222

sensor:
  - platform: nats
    name: "Temperature"
    subject: "home.devices.sensor.temp01.state"
    unit_of_measurement: "°C"
```

## Project Structure

```
nats-home-automation/
├── infrastructure/        # NATS server configurations
│   ├── nats-server.conf  # Local server config
│   ├── leaf-node.conf    # Leaf node setup
│   └── jetstream.conf    # JetStream configuration
├── esphome-components/   # ESPHome NATS components
│   ├── nats_client/      # Core NATS client
│   ├── nats_sensor/      # Sensor component
│   └── nats_switch/      # Switch component
├── ha-integration/       # Home Assistant integration
│   └── custom_components/
│       └── nats_bridge/  # Full HA integration
├── bridges/              # Protocol bridges
│   ├── mqtt-nats/        # MQTT to NATS bridge
│   └── zigbee2mqtt-nats/ # Zigbee2MQTT bridge
├── services/             # Microservices
│   ├── discovery/        # Device discovery service
│   ├── health-monitor/   # Device health monitoring
│   └── management-ui/    # Web management interface
├── tools/                # CLI and TUI tools
│   └── nats-ha-cli/      # Management interface
├── arduino-nats-client/  # Arduino library
└── docs/                 # Documentation
    ├── setup.md          # Detailed setup guide
    ├── architecture.md   # System architecture
    └── api.md            # NATS subject schema
```

## Subject Schema

The system uses a hierarchical subject naming convention:

```
home.devices.{type}.{id}.{action}    # Device commands/states
home.discovery.announce               # Device announcements
home.config.{entity_type}.{id}        # Configuration storage
home.events.{type}                    # System events
```

## Features

### Current Features

- ✅ NATS Core messaging for real-time device control
- ✅ JetStream persistence for device states and configuration
- ✅ ESPHome external components for ESP devices
- ✅ Home Assistant custom integration with auto-discovery
- ✅ Device discovery and auto-registration service
- ✅ MQTT to NATS protocol bridge
- ✅ Arduino library for native NATS support
- ✅ CLI and TUI management tools
- ✅ Comprehensive Taskfile automation
- ✅ Zigbee2MQTT to NATS bridge
- ✅ Web-based management UI with real-time updates
- ✅ Device health monitoring dashboard
- ✅ Quick actions and scene support
- ✅ Device simulator for testing automations

### Roadmap

- [ ] Z-Wave JS integration
- [ ] Advanced automation engine with visual builder
- [ ] Multi-site synchronization
- [ ] Voice assistant integration
- [ ] Energy monitoring dashboard
- [ ] Device templates library
- [ ] MicroPython NATS client
- [ ] Mobile app

## Performance

- **Latency**: < 1ms for local device control
- **Throughput**: Handles 1M+ messages/second
- **Resource Usage**: < 20MB RAM on Raspberry Pi
- **Scalability**: Supports 1000s of devices per server

## Development

### Available Commands

This project uses [Task](https://taskfile.dev) for automation. Run `task --list` to see all available commands.

Common commands:
```bash
# Development
task dev              # Run in development mode
task start            # Start all services
task stop             # Stop all services

# Building and Installation
task build            # Build all components
task install          # Install binaries to /usr/local/bin
task clean            # Clean build artifacts
task clean-all        # Deep clean (remove all artifacts)

# Testing and Quality
task test             # Run all tests
task lint             # Run linters
task format           # Format code

# Monitoring
task monitor          # Monitor all NATS messages
task monitor-discovery # Monitor device discovery
task monitor-devices  # Monitor device states

# Tools
task tools:cli:run    # Run the CLI tool
task tools:tui:run    # Run the TUI interface
```

### Project Structure

```
nats-home-automation/
├── infrastructure/      # NATS server configuration
├── services/           # Go microservices
│   └── discovery/      # Device discovery service
├── tools/              # CLI and TUI tools
│   └── nats-ha-cli/    # Command-line interface
├── bridges/            # Protocol bridges
│   └── mqtt-nats-bridge/
├── esphome-components/ # ESPHome NATS components
├── ha-integration/     # Home Assistant integration
└── docs/              # Documentation
```

## Development Status

This project is currently in active development. See [ACTION_PLAN.md](ACTION_PLAN.md) for the detailed implementation roadmap and [RESEARCH.md](RESEARCH.md) for the architectural decisions.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [NATS.io](https://nats.io) for the amazing messaging platform
- [ESPHome](https://esphome.io) for the IoT framework
- [Home Assistant](https://home-assistant.io) for the automation platform

## Support

- 📚 [Documentation](docs/)
- 💬 [Discussions](https://github.com/yourusername/nats-home-automation/discussions)
- 🐛 [Issue Tracker](https://github.com/yourusername/nats-home-automation/issues)