# NATS Bridge Home Assistant Integration

This custom integration bridges NATS-based IoT devices into Home Assistant, providing seamless integration between NATS messaging and Home Assistant's entity system.

## Features

- **Automatic Device Discovery**: Devices announcing on NATS are automatically discovered and added to Home Assistant
- **Bidirectional Communication**: Send commands to devices and receive state updates
- **Multiple Entity Types**: Support for sensors, binary sensors, switches, lights, and more
- **Real-time Updates**: Push-based updates for instant state changes
- **Connection Resilience**: Automatic reconnection with configurable retry logic
- **Service Integration**: Custom services for publishing messages and request/reply patterns

## Installation

### HACS Installation (Recommended)

1. Add this repository to HACS as a custom repository
2. Search for "NATS Bridge" in HACS
3. Install the integration
4. Restart Home Assistant

### Manual Installation

1. Copy the `custom_components/nats_bridge` folder to your Home Assistant's `custom_components` directory
2. Restart Home Assistant

## Configuration

### Via UI

1. Go to Settings → Devices & Services
2. Click "Add Integration"
3. Search for "NATS Bridge"
4. Enter your NATS server details:
   - **Host**: NATS server hostname or IP
   - **Port**: NATS server port (default: 4222)
   - **Discovery Prefix**: Subject prefix for device discovery (default: "home")
   - **Command Timeout**: Timeout for device commands in seconds (default: 5)
5. Configure authentication if required:
   - **Token**: NATS authentication token
   - **Username/Password**: Basic authentication credentials

### Configuration Options

After setup, you can modify options via the integration's configuration:

- **Discovery Prefix**: Change the NATS subject prefix
- **Command Timeout**: Adjust command timeout duration

## Device Discovery

Devices should announce themselves on the discovery subject with this format:

```json
{
  "device_id": "temp-sensor-01",
  "device_type": "sensor",
  "name": "Living Room Temperature",
  "manufacturer": "DIY",
  "model": "ESP32-DHT22",
  "sw_version": "1.0.0",
  "capabilities": {
    "sensors": ["temperature", "humidity"],
    "units": {
      "temperature": "°C",
      "humidity": "%"
    }
  }
}
```

## Subject Convention

The integration follows this subject hierarchy:

- `{prefix}.devices.{type}.{id}.state` - Device state updates
- `{prefix}.devices.{type}.{id}.command` - Device commands
- `{prefix}.devices.{type}.{id}.event` - Device events
- `{prefix}.devices.{type}.{id}.health` - Health status
- `{prefix}.discovery.announce` - Device announcements
- `{prefix}.discovery.request` - Discovery requests

## Supported Entity Types

### Sensors
- Temperature, humidity, pressure
- Battery, voltage, current, power, energy
- Illuminance, CO2, PM2.5
- Custom sensors with any numeric value

### Binary Sensors
- Motion, door, window, occupancy
- Smoke, moisture, vibration
- Custom binary states

### Switches
- On/off control
- Timer functionality
- State feedback

### Other Platforms
- Light (with brightness, color support)
- Climate (thermostat control)
- Cover (blinds, garage doors)
- Fan, Lock, Number, Select, Button, Text

## Services

### nats_bridge.publish
Publish a message to any NATS subject:
```yaml
service: nats_bridge.publish
data:
  subject: "home.devices.switch.kitchen.command"
  payload: '{"action": "on"}'
```

### nats_bridge.request
Send a request and wait for a reply:
```yaml
service: nats_bridge.request
data:
  subject: "home.devices.sensor.outdoor.command"
  payload: '{"action": "read"}'
  timeout: 10
```

### nats_bridge.reload
Reload the integration:
```yaml
service: nats_bridge.reload
```

## Example Automations

### Turn on lights at sunset
```yaml
automation:
  - alias: "Sunset Lights"
    trigger:
      - platform: sun
        event: sunset
    action:
      - service: switch.turn_on
        target:
          entity_id: switch.nats_porch_light
```

### Alert on sensor threshold
```yaml
automation:
  - alias: "High Temperature Alert"
    trigger:
      - platform: numeric_state
        entity_id: sensor.nats_greenhouse_temperature
        above: 30
    action:
      - service: notify.mobile_app
        data:
          message: "Greenhouse temperature is too high!"
```

## Troubleshooting

### Connection Issues
- Verify NATS server is accessible from Home Assistant
- Check firewall rules for port 4222
- Ensure authentication credentials are correct
- Check Home Assistant logs for connection errors

### Devices Not Appearing
- Verify devices are publishing to the correct discovery subject
- Check that device_type matches supported platforms
- Enable debug logging to see discovery messages
- Use NATS CLI to verify messages are being published

### Enable Debug Logging
Add to `configuration.yaml`:
```yaml
logger:
  default: info
  logs:
    custom_components.nats_bridge: debug
```

## Development

### Testing with NATS CLI
```bash
# Subscribe to all device messages
nats sub "home.devices.>"

# Simulate device announcement
nats pub home.discovery.announce '{"device_id":"test-01","device_type":"switch","name":"Test Switch"}'

# Send command to device
nats request home.devices.switch.test-01.command '{"action":"on"}' --timeout=5s
```

### Creating Custom Device Types

Implement these NATS subjects for your device:
1. Announce on `home.discovery.announce` with capabilities
2. Subscribe to `home.devices.{type}.{id}.command` for commands
3. Publish state to `home.devices.{type}.{id}.state`
4. Publish health to `home.devices.{type}.{id}.health` periodically

## License

This integration is part of the NATS Home Automation project and is licensed under the MIT License.