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
- **Home Assistant Bridge**: Bidirectional integration between NATS and HA
- **Protocol Bridges**: Translation layers for existing IoT protocols
- **Discovery Service**: Automatic device detection and registration

## Getting Started

### Prerequisites

- NATS Server 2.10+ (local installation or Synadia Cloud account)
- Home Assistant 2024.6+
- ESPHome 2024.6+
- Python 3.11+ / Go 1.21+

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nats-home-automation.git
cd nats-home-automation
```

2. Set up NATS infrastructure:
```bash
# Install NATS server locally
docker run -d --name nats -p 4222:4222 nats:latest -js

# Or use Synadia Cloud (recommended for production)
```

3. Install the Home Assistant integration:
```bash
cp -r ha-integration/custom_components/nats_bridge ~/.homeassistant/custom_components/
```

4. Configure your first ESP device:
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
│       └── nats_bridge/
├── bridges/              # Protocol bridges
│   ├── zigbee2mqtt/      # Zigbee bridge
│   └── mqtt/             # Generic MQTT bridge
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
- ✅ JetStream persistence for device states
- ✅ ESPHome external components for ESP devices
- ✅ Home Assistant custom integration
- ✅ Device discovery and auto-registration
- ✅ MQTT protocol bridge

### Roadmap

- [ ] Web-based management UI
- [ ] Advanced automation engine
- [ ] Multi-site synchronization
- [ ] Voice assistant integration
- [ ] Energy monitoring dashboard

## Performance

- **Latency**: < 1ms for local device control
- **Throughput**: Handles 1M+ messages/second
- **Resource Usage**: < 20MB RAM on Raspberry Pi
- **Scalability**: Supports 1000s of devices per server

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