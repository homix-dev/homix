# MQTT-NATS Bridge

Bidirectional bridge between MQTT (Home Assistant) and NATS for seamless integration.

## Features

- **Bidirectional Message Bridging**: Automatically forwards messages between MQTT and NATS
- **Home Assistant Discovery**: Supports automatic device discovery for both MQTT and NATS devices
- **Message Transformation**: Built-in transformers for common message formats
- **State Persistence**: Maintains device state across restarts
- **Metrics & Monitoring**: Prometheus metrics endpoint for monitoring
- **High Performance**: Async implementation with configurable concurrency
- **Flexible Configuration**: YAML/JSON config files or environment variables

## Installation

### Using pip

```bash
pip install -r requirements.txt
```

### Using Docker

```bash
docker build -t mqtt-nats-bridge .
docker run -e MQTT_HOST=localhost -e NATS_SERVERS=nats://localhost:4222 mqtt-nats-bridge
```

### Using Docker Compose

```bash
docker-compose up -d
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
# Edit .env with your settings
```

### Configuration File

Copy `config.example.yaml` to `config.yaml`:

```bash
cp config.example.yaml config.yaml
# Edit config.yaml with your settings
```

## Usage

### Basic Usage

```bash
# Using environment variables
python -m main

# Using config file
python -m main --config config.yaml

# With custom options
python -m main --mqtt-host 192.168.1.100 --log-level DEBUG
```

### Command Line Options

```
Options:
  -c, --config PATH       Configuration file (JSON or YAML)
  -l, --log-level LEVEL   Logging level [DEBUG|INFO|WARNING|ERROR|CRITICAL]
  --mqtt-host TEXT        MQTT broker host
  --mqtt-port INTEGER     MQTT broker port
  --nats-servers TEXT     NATS server URLs (comma-separated)
  --dry-run              Validate configuration without running
  --help                 Show this message and exit
```

## Message Flow

### MQTT to NATS

1. **Commands**: `homeassistant/switch/device_id/relay/set` → `home.devices.switch.device_id.command.relay`
2. **States**: `homeassistant/sensor/device_id/state` → `home.devices.sensor.device_id.state`
3. **Discovery**: `homeassistant/switch/device_id/config` → NATS device announcement

### NATS to MQTT

1. **States**: `home.devices.sensor.device_id.state` → `homeassistant/sensor/device_id/state`
2. **Events**: `home.devices.binary_sensor.device_id.event.motion` → `homeassistant/binary_sensor/device_id/motion`
3. **Discovery**: NATS device announcement → Home Assistant discovery configs

## Custom Topic Mappings

Define custom mappings in configuration:

```yaml
topic_mappings:
  # Zigbee2MQTT
  - mqtt_pattern: "zigbee2mqtt/+/set"
    nats_pattern: "home.devices.zigbee.*.command"
    bidirectional: true
  
  # Tasmota
  - mqtt_pattern: "tele/+/SENSOR"
    nats_pattern: "home.devices.tasmota.*.telemetry"
    bidirectional: false
```

## Discovery

### MQTT Device Discovery

When a Home Assistant MQTT discovery message is received:
1. Bridge creates a NATS device announcement
2. Device capabilities are extracted from config
3. Device is registered in NATS ecosystem

### NATS Device Discovery

When a NATS device announces itself:
1. Bridge creates Home Assistant discovery configs
2. One config per device capability
3. Appropriate component type is determined automatically

## Monitoring

### Prometheus Metrics

Available at `http://localhost:9090/metrics`:

- `bridge_mqtt_messages_total`: Total MQTT messages received
- `bridge_nats_messages_total`: Total NATS messages received
- `bridge_messages_bridged_total`: Successfully bridged messages
- `bridge_messages_dropped_total`: Dropped messages (queue full)
- `bridge_errors_total`: Error count by type
- `bridge_mqtt_connected`: MQTT connection status
- `bridge_nats_connected`: NATS connection status
- `bridge_discovered_devices_total`: Discovered devices by source

### Health Check

The bridge automatically monitors connections and reconnects if needed.

## Transformers

Built-in message transformers handle common conversions:

### Home Assistant Commands
- ON/OFF → boolean
- Brightness values → integers
- Color values → RGB arrays

### Device States
- Flattens nested state objects
- Adds metadata fields
- Converts timestamps

### Custom Transformers

Register custom transformers in code:

```python
from transformers import MessageTransformer

transformer = MessageTransformer()
transformer.register_mqtt_to_nats(
    "custom/+/topic",
    my_custom_transformer
)
```

## State Persistence

Bridge state is saved to `bridge_state.json`:
- Discovered devices
- Last message timestamps
- Statistics

## Troubleshooting

### Enable Debug Logging

```bash
python -m main --log-level DEBUG
```

### Check Connections

```bash
# Test MQTT
mosquitto_sub -h localhost -t '#' -v

# Test NATS
nats sub '>'
```

### Common Issues

1. **Connection refused**: Check broker addresses and ports
2. **Authentication failed**: Verify credentials
3. **No messages bridged**: Check topic mappings and patterns
4. **High memory usage**: Reduce buffer sizes in config

## Development

### Running Tests

```bash
pytest tests/ -v
```

### Adding New Component Types

1. Add to `discovery.py` component_map
2. Create `_create_{component}_config` method
3. Update `_determine_component_type` logic

### Adding New Transformers

1. Add to `transformers.py`
2. Register in `_register_default_transformers`
3. Implement transformation logic