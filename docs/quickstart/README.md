# NATS Home Automation - Comprehensive Quick Start Guide

Get NATS Home Automation running quickly with this comprehensive guide covering Docker/Podman setup, local development, and device simulation.

## Prerequisites

- **Go 1.21+** (for building services)
- **Docker or Podman** (for containerized setup)
- **NATS Server** (for local development)
- **Python 3.8+** (optional, for ESPHome integration)

## Quick Start Options

### Option 1: One-Command Setup (Recommended)

```bash
# Complete setup and start all services
task setup && task start
```

Services will be available at:
- **Management UI**: http://localhost:8081 (login: admin/admin)
- **Health Monitor**: http://localhost:8082
- **Device Simulator**: http://localhost:8083
- **NATS Monitor**: http://localhost:8222

### Option 2: Docker/Podman Compose

```bash
# For Podman users
export CONTAINER_TOOL=podman

# Basic services only
task up

# With device simulator
task up:with-simulator

# Full stack including Home Assistant
task up:full
```

### Option 3: Local Development (No Containers)

Run everything locally without containers - perfect for development:

```bash
# Use the local runner script
./run-local.sh
```

Or start services manually:

```bash
# Terminal 1: NATS Server
nats-server -c infrastructure/nats-server-dev.conf

# Terminal 2: Device Simulator
cd services/device-simulator && go run main.go

# Terminal 3: Management UI
cd services/management-ui && go run main.go

# Terminal 4: Health Monitor
cd services/health-monitor && go run main.go
```

## Essential Commands

| Command | Description |
|---------|-------------|
| `task setup` | Install dependencies and setup project |
| `task start` | Start all services natively |
| `task dev` | Development mode with tmux |
| `task up` | Start with Docker/Podman Compose |
| `task stop` | Stop all services |
| `task status` | Check service status |
| `task monitor` | Monitor NATS messages |
| `task logs` | View container logs |
| `task down` | Stop and remove containers |
| `task fix` | Fix common issues (ports, processes) |

## Using the Device Simulator

The device simulator helps you test automations without physical hardware.

### Getting Started with Device Simulator

1. **Access the Simulator**
   - Open http://localhost:8083 in your browser

2. **Create Devices**
   - Click "Add Device"
   - Choose a device type (Light, Sensor, Thermostat, etc.)
   - Name it and optionally assign to a room
   - Click "Save Device"

3. **Control Devices**
   - Click "Control" on any device card
   - Use interactive controls to change states
   - Watch real-time updates

4. **Import Sample Devices**
   - Click "Import" in the Device Simulator
   - Select `examples/simulator-devices.json`
   - This creates 6 pre-configured devices

### Available Device Types

- **Light**: On/off, brightness control
- **Switch**: Simple on/off
- **Sensor**: Temperature & humidity with automatic variations
- **Thermostat**: Temperature control with modes
- **Lock**: Lock/unlock states
- **Cover**: Blinds/curtains with position control
- **Motion Sensor**: Motion detection
- **Door Sensor**: Contact open/closed
- **Camera**: Recording state
- **Fan**: Speed control

### Example Test Scenario

1. Create a motion sensor: "Hallway Motion"
2. Create a light: "Hallway Light"
3. In Management UI (http://localhost:8081):
   - Create an automation
   - Trigger: When "Hallway Motion" detects motion
   - Action: Turn on "Hallway Light"
4. In Device Simulator, trigger the motion sensor
5. Watch the light turn on automatically!

## Development Workflow

### Check Dependencies

```bash
task check-deps
```

### Development Mode

```bash
# Run everything in tmux (recommended)
task dev

# Or start services individually
task services:discovery:run
task services:management-ui:run
task services:health-monitor:run
```

### Testing

```bash
# Send test device announcement
task announce-test

# Monitor all NATS messages
task monitor

# List registered devices
task devices-list

# Run tests
task test
```

### Installing Binaries

```bash
# Install all binaries to /usr/local/bin
task install

# Install individually
task services:discovery:install
task tools:cli:install
```

After installation:
- `discovery-service` - Device discovery and registry service
- `nats-ha` - CLI tool for managing NATS home automation

## System Service Installation

### Linux (systemd)
```bash
task services:discovery:install-service
```

### macOS (launchd)
```bash
task services:discovery:install-service-macos
```

## Using the CLI Tool

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

## Troubleshooting

### Container Issues

If Docker isn't available but Podman is:
```bash
export CONTAINER_TOOL=podman
task up
```

Authentication issues:
```bash
# For Podman
podman login docker.io

# For Docker
docker login
```

### Port Conflicts

Default ports:
- 4222: NATS Server
- 8081: Management UI
- 8082: Health Monitor
- 8083: Device Simulator
- 8222: NATS HTTP Monitor
- 9222: NATS WebSocket

To fix port conflicts:
```bash
task fix
```

### Services Won't Start

```bash
task stop        # Stop everything
task status      # Check what's still running
task start       # Try again
```

### Connection Issues

Default NATS connection:
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

# Install NATS Python client
pip3 install --user nats-py
```

## Next Steps

1. **Explore the Management UI**
   - Create visual automations
   - Manage devices and scenes
   - Configure dashboards

2. **Test with Device Simulator**
   - Create various device types
   - Test automation triggers
   - Simulate real-world scenarios

3. **Deploy Real Devices**
   - Set up ESPHome devices with NATS components
   - Configure Home Assistant with MQTT-NATS bridge
   - Create custom automations

4. **Monitor System Health**
   - Check Health Monitor dashboard
   - Review NATS monitoring interface
   - Set up alerts and notifications

## Additional Resources

- [Architecture Documentation](../architecture.md)
- [API Reference](../api.md)
- [Development Guide](../development/)
- [NATS CLI Examples](../nats-cli-examples.md)
- [Subject Schema](../subject-schema.md)

For detailed documentation on specific components, see the [docs/](../) directory.