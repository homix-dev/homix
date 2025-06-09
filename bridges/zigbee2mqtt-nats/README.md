# Zigbee2MQTT to NATS Bridge

This bridge connects Zigbee2MQTT to the NATS messaging system, allowing Zigbee devices to be integrated into the NATS Home Automation ecosystem.

## Features

- **Bidirectional Communication**: Receives Zigbee device states from MQTT and publishes to NATS, and vice versa
- **Automatic Device Discovery**: Discovers and announces Zigbee devices on NATS
- **Device Type Detection**: Automatically categorizes devices (sensor, switch, light, etc.)
- **Command Translation**: Converts NATS commands to Zigbee2MQTT format
- **State Synchronization**: Keeps device states synchronized between systems
- **Event Forwarding**: Forwards Zigbee2MQTT bridge events to NATS

## Prerequisites

- Zigbee2MQTT installed and running
- MQTT broker (e.g., Mosquitto)
- NATS server
- Go 1.21 or later (for building from source)

## Installation

### From Source

```bash
# Clone the repository
cd bridges/zigbee2mqtt-nats

# Build
go build -o zigbee2mqtt-nats

# Install
sudo cp zigbee2mqtt-nats /usr/local/bin/
```

### Using Task

```bash
# From the project root
task bridges:zigbee:build
task bridges:zigbee:install
```

## Configuration

Create a `config.yaml` file:

```yaml
# MQTT Configuration (Zigbee2MQTT)
mqtt:
  broker: tcp://localhost:1883
  client_id: zigbee2mqtt-nats-bridge
  username: ""
  password: ""
  base_topic: zigbee2mqtt

# NATS Configuration
nats:
  url: nats://localhost:4222
  credentials: ""  # Path to NATS credentials file
  base_subject: home.devices.zigbee

# Logging
debug: false
```

### Environment Variables

You can also use environment variables (prefix with `Z2M_NATS_`):

```bash
export Z2M_NATS_MQTT_BROKER=tcp://mqtt.local:1883
export Z2M_NATS_NATS_URL=nats://nats.local:4222
export Z2M_NATS_DEBUG=true
```

## Usage

### Running the Bridge

```bash
# Using config file
zigbee2mqtt-nats --config /path/to/config.yaml

# Using command line flags
zigbee2mqtt-nats \
  --mqtt-broker tcp://localhost:1883 \
  --nats-url nats://localhost:4222 \
  --debug
```

### Systemd Service

Create `/etc/systemd/system/zigbee2mqtt-nats.service`:

```ini
[Unit]
Description=Zigbee2MQTT to NATS Bridge
After=network.target nats.service mosquitto.service

[Service]
Type=simple
User=zigbee2mqtt
ExecStart=/usr/local/bin/zigbee2mqtt-nats --config /etc/zigbee2mqtt-nats/config.yaml
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable zigbee2mqtt-nats
sudo systemctl start zigbee2mqtt-nats
```

## NATS Subject Structure

The bridge uses the following NATS subject hierarchy:

### Device States
```
home.devices.zigbee.{device_type}.{device_name}.state
```

Example:
```
home.devices.zigbee.sensor.living_room_temp.state
home.devices.zigbee.switch.kitchen_light.state
```

### Device Commands
```
home.devices.zigbee.{device_type}.{device_name}.command
```

### Device Announcements
```
home.devices.zigbee.{device_type}.{device_name}.announce
```

### Bridge Events
```
home.devices.zigbee.bridge.state
home.devices.zigbee.bridge.event
home.devices.zigbee.devices
```

## Message Formats

### Device State Message
```json
{
  "device_id": "living_room_temp",
  "ieee_address": "0x00124b001234abcd",
  "manufacturer": "Xiaomi",
  "model": "WSDCGQ11LM",
  "temperature": 22.5,
  "humidity": 45.2,
  "battery": 87,
  "link_quality": 115,
  "timestamp": 1701234567
}
```

### Command Message
```json
{
  "state": "ON",
  "brightness": 255,
  "color": {
    "r": 255,
    "g": 128,
    "b": 0
  }
}
```

### Device Announcement
```json
{
  "device_id": "kitchen_light",
  "ieee_address": "0x00124b005678efgh",
  "type": "light",
  "manufacturer": "IKEA",
  "model": "LED1924G9",
  "power_source": "Mains (single phase)",
  "supported": true,
  "network_address": 12345,
  "features": ["state", "brightness", "color_temp"]
}
```

## Device Type Detection

The bridge automatically detects device types based on their exposed features:

- **switch**: Devices with switch capability
- **light**: Devices with light features
- **sensor**: Devices exposing temperature, humidity, pressure
- **binary_sensor**: Devices with occupancy, contact, water_leak
- **lock**: Devices with lock capability
- **climate**: HVAC devices
- **cover**: Blinds, curtains

## Integration Examples

### Home Assistant via NATS

Devices bridged through this service automatically appear in Home Assistant when using the NATS Home Assistant integration.

### Node-RED

Subscribe to device states:
```javascript
// Subscribe to all Zigbee sensors
msg.topic = "home.devices.zigbee.sensor.>";
return msg;
```

Send commands:
```javascript
// Turn on a light
msg.topic = "home.devices.zigbee.light.kitchen_light.command";
msg.payload = {
    state: "ON",
    brightness: 200
};
return msg;
```

### Python Example

```python
import asyncio
import json
from nats.aio.client import Client as NATS

async def run():
    nc = await nats.connect("nats://localhost:4222")
    
    # Subscribe to temperature sensors
    async def temp_handler(msg):
        data = json.loads(msg.data.decode())
        print(f"Temperature in {data['device_id']}: {data['temperature']}°C")
    
    await nc.subscribe("home.devices.zigbee.sensor.*.state", cb=temp_handler)
    
    # Send command to turn on light
    command = json.dumps({"state": "ON", "brightness": 255})
    await nc.publish("home.devices.zigbee.light.bedroom.command", command.encode())
```

## Monitoring

### Check Bridge Status

```bash
# Using NATS CLI
nats sub home.devices.zigbee.bridge.state

# Check device list
nats req home.devices.zigbee.devices ""
```

### View Logs

```bash
# If running as systemd service
sudo journalctl -u zigbee2mqtt-nats -f

# With debug enabled
zigbee2mqtt-nats --debug
```

## Troubleshooting

### Bridge Not Connecting

1. Check MQTT broker is running
2. Verify Zigbee2MQTT is running
3. Check NATS server is accessible
4. Verify credentials and permissions

### Devices Not Appearing

1. Check Zigbee2MQTT has paired devices
2. Verify MQTT topics match configuration
3. Enable debug logging to see message flow
4. Check NATS subscriptions

### Commands Not Working

1. Verify device supports the command
2. Check command format matches Zigbee2MQTT expectations
3. Monitor MQTT traffic to see if commands are forwarded
4. Check Zigbee2MQTT logs for errors

## Development

### Building

```bash
go build -o zigbee2mqtt-nats
```

### Running Tests

```bash
go test ./...
```

### Adding Features

1. Device type detection: Update `getDeviceType()` method
2. Custom attributes: Modify `handleDeviceState()` 
3. New commands: Extend `handleNATSCommand()`

## License

Part of the NATS Home Automation project.