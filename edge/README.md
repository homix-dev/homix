# NATS Home Edge Server

The edge server is the heart of your home automation system. It runs locally in your home and handles all device communication, automation execution, and cloud synchronization.

## Architecture

The edge server is a single Go binary that combines:
- **NATS Server** (configured as leaf node to Synadia Cloud)
- **Automation Engine** (executes rules locally)
- **Device Gateway** (protocol translation)
- **Local Cache** (offline operation)

## Quick Start

### Using Docker

```bash
docker run -d \
  --name nats-home-edge \
  --network host \
  -v ~/.synadia/NGS-Home.creds:/creds/cloud.creds:ro \
  -e HOME_NAME="My Home" \
  ghcr.io/calmera/nats-home-edge:latest
```

### Building from Source

```bash
# Clone repository
git clone https://github.com/calmera/nats-home-automation
cd nats-home-automation/edge

# Build
go build -o nats-home-edge ./cmd/edge

# Run
SYNADIA_CREDS=~/.synadia/NGS-Home.creds \
HOME_NAME="My Home" \
./nats-home-edge
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SYNADIA_URL` | Synadia Cloud URL | `tls://connect.ngs.global` |
| `SYNADIA_CREDS` | Path to credentials file | `/creds/cloud.creds` |
| `HOME_ID` | Unique home identifier | Auto-generated |
| `HOME_NAME` | Display name | `My Home` |
| `HOME_LAT` | Latitude | - |
| `HOME_LON` | Longitude | - |
| `HOME_TZ` | Timezone | `America/New_York` |
| `LOCAL_NATS_PORT` | Port for local devices | `4222` |
| `LOG_LEVEL` | Logging level | `info` |

### Configuration File

Create `edge.yaml`:
```yaml
cloud:
  url: tls://connect.ngs.global
  credentials: /creds/cloud.creds
  reconnect_wait: 2s

home:
  id: home-beach-house
  name: Beach House
  location:
    latitude: 25.7617
    longitude: -80.1918
    timezone: America/Miami

local:
  port: 4222
  websocket:
    port: 9222
    enabled: true

gateway:
  discovery:
    - mdns
    - ssdp
  bridges:
    mqtt:
      enabled: true
      port: 1883
    http:
      enabled: true
      port: 8080

automation:
  state_store: /data/automations
  sync_interval: 30s

logging:
  level: info
  format: json
```

## Features

### Device Gateway

Automatically discovers and integrates:
- **mDNS/Bonjour** devices
- **SSDP/UPnP** devices
- **MQTT** devices (built-in bridge)
- **HTTP/REST** devices

### Automation Engine

- Executes automations locally (no cloud dependency)
- Sub-millisecond reaction time
- Supports complex conditions and actions
- State persistence across restarts

### Protocol Bridges

#### MQTT Bridge
Translates between MQTT and NATS:
```
MQTT: home/bedroom/light/set → NATS: home.devices.bedroom-light.command
MQTT: home/bedroom/light/state → NATS: home.devices.bedroom-light.state
```

#### HTTP Bridge
REST API for devices that can't use NATS directly:
```
POST /api/devices/{device-id}/command
GET /api/devices/{device-id}/state
```

### Offline Operation

When cloud connection is lost:
1. All automations continue running
2. Local device control works normally
3. State changes are cached
4. Automatic sync when reconnected

## Development

### Prerequisites

- Go 1.21+
- Docker (for testing)
- Task (optional, for automation)

### Running Locally

```bash
# Install dependencies
go mod download

# Run with hot reload
air -c .air.toml

# Or run directly
go run ./cmd/edge
```

### Running Tests

```bash
# Unit tests
go test ./...

# Integration tests
go test -tags=integration ./...

# With coverage
go test -cover ./...
```

### Project Structure

```
edge/
├── cmd/
│   └── edge/          # Main application entry point
├── internal/
│   ├── automation/    # Automation engine
│   ├── gateway/       # Device gateway and discovery
│   ├── leafnode/      # NATS leaf node management
│   └── bridges/       # Protocol bridges (MQTT, HTTP)
├── config/
│   └── edge.yaml      # Default configuration
├── Dockerfile         # Container image
└── go.mod            # Dependencies
```

## Monitoring

### Health Check

```bash
curl http://localhost:8222/healthz
```

### Metrics (Prometheus)

```bash
curl http://localhost:2112/metrics
```

Key metrics:
- `edge_devices_total` - Total connected devices
- `edge_automations_total` - Total automations
- `edge_messages_total` - Messages processed
- `edge_cloud_connected` - Cloud connection status

### NATS Monitoring

```bash
# View server info
curl http://localhost:8222/varz

# View connections
curl http://localhost:8222/connz

# View routes
curl http://localhost:8222/routez
```

## Troubleshooting

### Debug Logging

Enable debug logs:
```bash
LOG_LEVEL=debug ./nats-home-edge
```

### Common Issues

**Cloud connection fails**
- Check credentials file is valid
- Verify internet connectivity
- Check firewall allows outbound TLS (port 443)

**Devices can't connect**
- Ensure port 4222 is not blocked
- Check devices are on same network
- Verify device has valid credentials

**Automations not running**
- Check automation syntax in logs
- Verify devices referenced exist
- Ensure edge server has sufficient permissions

## Security

### Network Security
- All cloud connections use TLS
- Local connections can use TLS (optional)
- No inbound connections required from internet

### Device Security
- Each device has unique JWT credentials
- Credentials are revocable
- Automatic rotation supported
- Least privilege access model

### Data Security
- All data encrypted in transit
- Local cache encrypted at rest
- No sensitive data logged

## Contributing

See [CONTRIBUTING.md](/CONTRIBUTING.md) for development guidelines.

## License

Apache 2.0 - see [LICENSE](/LICENSE)