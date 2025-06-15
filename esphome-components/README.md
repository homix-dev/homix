# ESPHome NATS Components

Custom ESPHome components for integrating ESP32/ESP8266 devices with NATS messaging system.

## Components

### nats_client
Core NATS client component that handles:
- Connection management with auto-reconnect
- Device discovery announcements
- Authentication
- Subject prefix management
- JSON message publishing

### nats_sensor
Publishes sensor readings to NATS:
- Supports all ESPHome sensor types
- Configurable publish intervals
- Includes device metadata and attributes
- State-based and periodic publishing

### nats_switch
Bi-directional switch control via NATS:
- Subscribe to command topics for remote control
- Publish state changes
- GPIO support
- Optimistic mode for virtual switches
- State restoration options

### nats_binary_sensor
Publishes binary sensor states to NATS:
- Supports all ESPHome binary sensor types
- Event publishing on state changes
- Configurable initial state publishing
- Device class specific attributes

## Installation

Add to your ESPHome configuration:

```yaml
external_components:
  - source:
      type: git
      url: https://github.com/homix-dev/homix
      ref: main
    components: [ nats_client, nats_sensor, nats_switch, nats_binary_sensor ]
```

Or for local development:

```yaml
external_components:
  - source:
      type: local
      path: /path/to/nats-home-automation/esphome-components
    components: [ nats_client, nats_sensor, nats_switch, nats_binary_sensor ]
```

## Basic Configuration

```yaml
# NATS client (required)
nats_client:
  server: "192.168.1.100"
  port: 4222
  username: "home"
  password: "your-password"
  device_id: "unique-device-id"
  device_name: "Friendly Device Name"
  device_type: "sensor"
  manufacturer: "DIY"
  model: "ESP32"

# Example sensor
sensor:
  - platform: dht
    pin: GPIO23
    temperature:
      id: temp_sensor
      name: "Temperature"
    update_interval: 30s

  - platform: nats_sensor
    name: "Temperature"
    sensor_id: temp_sensor
    subject_suffix: "temperature"
    unit_of_measurement: "°C"
    device_class: temperature
    publish_interval: 60s

# Example switch
switch:
  - platform: nats_switch
    name: "Relay"
    subject_suffix: "relay"
    gpio_pin: GPIO32
    restore_mode: RESTORE_DEFAULT_OFF

# Example binary sensor
binary_sensor:
  - platform: gpio
    pin: GPIO27
    id: motion
    name: "Motion"
    device_class: motion

  - platform: nats_binary_sensor
    name: "Motion"
    sensor_id: motion
    subject_suffix: "motion"
    device_class: motion
```

## NATS Subject Structure

The components use the following subject hierarchy:

- Discovery: `home.discovery.announce`
- Device state: `home.devices.{type}.{id}.state`
- Device events: `home.devices.{type}.{id}.event.{sensor}`
- Commands: `home.devices.{type}.{id}.command.{actuator}`
- Status: `home.devices.{type}.{id}.status`

## Message Formats

### Device Announcement
```json
{
  "device_id": "esp32-livingroom",
  "device_type": "sensor",
  "device_name": "Living Room Sensor",
  "manufacturer": "DIY",
  "model": "ESP32-Multi",
  "firmware_version": "2023.12.0",
  "ip_address": "192.168.1.150",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "capabilities": ["temperature", "humidity", "motion", "relay1", "relay2"],
  "status": "online"
}
```

### Sensor State
```json
{
  "timestamp": 1703001234,
  "device_id": "esp32-livingroom",
  "state": {
    "temperature": 22.5,
    "unit": "°C"
  },
  "attributes": {
    "accuracy_decimals": 1,
    "device_class": "temperature",
    "state_class": "measurement"
  }
}
```

### Switch Command
```json
{
  "command": "on"
}
```
or
```json
{
  "state": true
}
```

### Binary Sensor Event
```json
{
  "timestamp": 1703001234,
  "device_id": "esp32-livingroom",
  "sensor": "motion",
  "state": true,
  "previous_state": false
}
```

## Advanced Features

### Custom Subject Prefixes
```yaml
nats_client:
  # ... other config ...
  subject_prefix: "custom.prefix"  # Results in custom.prefix.{type}.{id}.*
```

### Force Updates
```yaml
sensor:
  - platform: nats_sensor
    # ... other config ...
    force_update: true  # Publish even if value hasn't changed
    expire_after: 300   # Mark as unavailable after 5 minutes
```

### Virtual Switches
```yaml
switch:
  - platform: nats_switch
    name: "Virtual Switch"
    subject_suffix: "virtual"
    optimistic: true      # No GPIO, optimistic mode
    assumed_state: false  # Know the state
```

## Troubleshooting

Enable debug logging:
```yaml
logger:
  level: DEBUG
  logs:
    nats_client: DEBUG
    nats_sensor: DEBUG
    nats_switch: DEBUG
    nats_binary_sensor: DEBUG
```

Common issues:
1. Connection failures - Check server IP, port, and credentials
2. No messages published - Verify NATS client is connected
3. Commands not received - Check subject patterns match