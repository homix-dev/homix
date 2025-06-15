# Device Discovery Service

The Discovery Service is responsible for managing device registration and discovery in the NATS home automation system.

## Features

- Device registration and discovery
- Device registry using NATS KV store
- Automatic device status monitoring
- Device capability parsing
- Service health checks
- Event publishing for device lifecycle
- Configuration management with validation
- Configuration backup and restore
- Custom configuration schemas

## Building

### Local Build
```bash
go mod download
go build -o discovery .
```

### Docker Build
```bash
docker build -t nats-discovery:latest .
```

## Running

### Local
```bash
# Using default config
./discovery

# With custom config
./discovery --config /path/to/config.yaml

# With command line options
./discovery --nats-url nats://localhost:4222 --debug
```

### Docker
```bash
docker run -d \
  --name discovery-service \
  --network host \
  -v $(pwd)/discovery.yaml:/root/discovery.yaml \
  nats-discovery:latest
```

### Docker Compose
Add to your docker-compose.yml:
```yaml
services:
  discovery:
    build: ./services/discovery
    container_name: discovery-service
    depends_on:
      - nats
    environment:
      - DISCOVERY_NATS_URL=nats://nats:4222
      - DISCOVERY_NATS_USER=home
      - DISCOVERY_NATS_PASSWORD=changeme
    networks:
      - nats-network
```

## Configuration

Configuration can be provided via:
1. Configuration file (discovery.yaml)
2. Environment variables (prefix: DISCOVERY_)
3. Command line flags

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `debug` | Enable debug logging | false |
| `nats.url` | NATS server URL | nats://localhost:4222 |
| `nats.user` | NATS username | - |
| `nats.password` | NATS password | - |
| `nats.credentials` | Path to NATS credentials file | - |
| `store.bucket` | KV bucket name | device_registry |
| `store.ttl` | Device TTL in registry | 24h |
| `store.max_devices` | Maximum devices allowed | 1000 |

## API

### Subscriptions

#### Device Announcement
- **Subject**: `home.discovery.announce`
- **Purpose**: Devices announce their presence
- **Payload**: Device information (see models/device.go)

#### Discovery Request
- **Subject**: `home.discovery.request`
- **Pattern**: Request/Reply
- **Request**: Optional filters (device_type, online)
- **Response**: List of devices matching criteria

#### Service Status
- **Subject**: `home.services.discovery.status`
- **Pattern**: Request/Reply
- **Response**: Service health and statistics

#### Service Commands
- **Subject**: `home.services.discovery.command`
- **Pattern**: Request/Reply
- **Commands**:
  - `get_device`: Get specific device by ID
  - `delete_device`: Remove device from registry
  - `get_stats`: Get registry statistics

### Configuration Management

#### Device Configuration
- **Subject**: `home.config.device.{device_id}`
- **Pattern**: Request/Reply
- **Purpose**: Get device configuration directly

#### Configuration Commands
- **Subject**: `home.services.config.command`
- **Pattern**: Request/Reply
- **Commands**:
  - `set_device_config`: Store device configuration
  - `get_device_config`: Retrieve device configuration
  - `delete_device_config`: Remove device configuration
  - `list_device_configs`: List all configurations
  - `set_system_config`: Store system configuration
  - `get_system_config`: Retrieve system configuration
  - `create_backup`: Create configuration backup
  - `restore_backup`: Restore from backup
  - `set_config_schema`: Define validation schema

### Events Published

- `home.events.system.service_started`: Service startup
- `home.events.system.service_stopped`: Service shutdown
- `home.events.system.device_registered`: New device registered
- `home.events.system.device_offline`: Device went offline

## Testing

### Configuration Examples

Set device configuration:
```bash
nats request home.services.config.command '{
  "command": "set_device_config",
  "params": {
    "device_type": "sensor",
    "config": {
      "device_id": "temp01",
      "name": "Living Room Temperature",
      "enabled": true,
      "settings": {
        "update_interval": 30,
        "calibration_offset": 0.5
      }
    }
  }
}' --timeout 2s
```

Get device configuration:
```bash
nats request home.config.device.temp01 '' --timeout 2s
```

Create backup:
```bash
nats request home.services.config.command '{
  "command": "create_backup",
  "params": {"description": "Before update"}
}' --timeout 2s
```

### Register a test device:
```bash
nats pub home.discovery.announce '{
  "device_id": "test01",
  "device_type": "sensor",
  "name": "Test Sensor",
  "manufacturer": "Test Corp",
  "model": "TS-01",
  "capabilities": {
    "sensors": ["temperature", "humidity"]
  },
  "topics": {
    "state": "home.devices.sensor.test01.state",
    "status": "home.devices.sensor.test01.status"
  }
}'
```

### List all devices:
```bash
nats request home.discovery.request '' --timeout 2s
```

### Get service status:
```bash
nats request home.services.discovery.status '' --timeout 2s
```

### Get specific device:
```bash
nats request home.services.discovery.command '{
  "command": "get_device",
  "params": {"device_id": "test01"}
}' --timeout 2s
```

## Monitoring

The service provides health checks and statistics via:
- NATS subject: `home.services.discovery.status`
- Logs: Structured logging with configurable levels
- Events: System events for monitoring device lifecycle

## Development

### Project Structure
```
discovery/
├── cmd/           # Command line interface
├── internal/      # Internal packages
│   ├── config/    # Configuration
│   ├── models/    # Data models
│   ├── registry/  # Device registry
│   └── service/   # Main service logic
├── main.go        # Entry point
├── go.mod         # Go modules
└── discovery.yaml # Default configuration
```

### Adding New Features

1. Device capabilities: Extend `models/device.go`
2. New commands: Add handlers in `service/service.go`
3. Registry operations: Modify `registry/registry.go`

## Troubleshooting

### Service won't start
- Check NATS connectivity
- Verify credentials/authentication
- Check if KV bucket can be created

### Devices not appearing
- Verify device announcement format
- Check service logs for errors
- Ensure device ID is unique

### Performance issues
- Monitor registry size
- Check TTL settings
- Review device status check interval