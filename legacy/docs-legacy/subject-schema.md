# NATS Subject Schema for Home Automation

## Overview

This document defines the subject hierarchy and messaging patterns for the NATS-based home automation system. All subjects follow a hierarchical dot-notation pattern that enables efficient routing and wildcarding.

## Subject Hierarchy

### 1. Device Messages

#### State Updates
```
home.devices.{type}.{id}.state
```
- **Purpose**: Device state updates (sensor readings, status changes)
- **Pattern**: Publish only
- **Example**: `home.devices.sensor.temp01.state`
- **Payload**: JSON with timestamp and state data

#### Commands
```
home.devices.{type}.{id}.command
```
- **Purpose**: Send commands to devices
- **Pattern**: Request/Reply
- **Example**: `home.devices.switch.light01.command`
- **Payload**: JSON with command and parameters

#### Status
```
home.devices.{type}.{id}.status
```
- **Purpose**: Device health and connectivity status
- **Pattern**: Publish only
- **Example**: `home.devices.sensor.temp01.status`
- **Payload**: JSON with online/offline, battery, signal strength

### 2. Discovery

#### Device Announcement
```
home.discovery.announce
```
- **Purpose**: New devices announce their presence
- **Pattern**: Publish only
- **Payload**: JSON with device metadata and capabilities

#### Discovery Request
```
home.discovery.request
```
- **Purpose**: Request all devices to re-announce
- **Pattern**: Publish only
- **Payload**: Empty or filter criteria

### 3. Configuration

#### Device Config
```
home.config.device.{id}
```
- **Purpose**: Device-specific configuration
- **Pattern**: KV Store backed
- **Example**: `home.config.device.temp01`

#### System Config
```
home.config.system.{component}
```
- **Purpose**: System-wide configuration
- **Pattern**: KV Store backed
- **Example**: `home.config.system.discovery`

### 4. Events

#### System Events
```
home.events.system.{event_type}
```
- **Purpose**: System-wide events (startup, shutdown, errors)
- **Example**: `home.events.system.startup`

#### Device Events
```
home.events.device.{event_type}
```
- **Purpose**: Device-specific events (connected, disconnected, error)
- **Example**: `home.events.device.connected`

#### Automation Events
```
home.events.automation.{event_type}
```
- **Purpose**: Automation triggers and results
- **Example**: `home.events.automation.triggered`

### 5. Services

#### Service Status
```
home.services.{service}.status
```
- **Purpose**: Microservice health checks
- **Pattern**: Request/Reply
- **Example**: `home.services.discovery.status`

#### Service Commands
```
home.services.{service}.command
```
- **Purpose**: Inter-service communication
- **Pattern**: Request/Reply
- **Example**: `home.services.bridge.command`

## Device Types

Standard device types for consistent naming:

- `sensor` - Temperature, humidity, motion, etc.
- `binary_sensor` - Door, window, motion detection
- `switch` - On/off devices
- `light` - Dimmable lights, RGB lights
- `cover` - Blinds, curtains, garage doors
- `climate` - Thermostats, AC units
- `lock` - Smart locks
- `camera` - Security cameras
- `media_player` - TVs, speakers

## Message Payload Standards

### State Update Payload
```json
{
  "timestamp": "2024-01-07T10:30:00Z",
  "device_id": "temp01",
  "state": {
    "temperature": 22.5,
    "humidity": 45,
    "unit": "celsius"
  },
  "attributes": {
    "battery": 85,
    "rssi": -45
  }
}
```

### Command Payload
```json
{
  "command": "set_state",
  "parameters": {
    "state": "on",
    "brightness": 75
  },
  "request_id": "uuid-here"
}
```

### Discovery Announcement Payload
```json
{
  "device_id": "temp01",
  "device_type": "sensor",
  "manufacturer": "Generic",
  "model": "TH01",
  "name": "Living Room Temperature",
  "capabilities": {
    "sensors": ["temperature", "humidity"],
    "units": {
      "temperature": "celsius",
      "humidity": "percent"
    }
  },
  "topics": {
    "state": "home.devices.sensor.temp01.state",
    "status": "home.devices.sensor.temp01.status",
    "command": "home.devices.sensor.temp01.command"
  }
}
```

### Status Payload
```json
{
  "timestamp": "2024-01-07T10:30:00Z",
  "device_id": "temp01",
  "online": true,
  "last_seen": "2024-01-07T10:30:00Z",
  "diagnostics": {
    "battery": 85,
    "rssi": -45,
    "uptime": 3600,
    "firmware": "1.2.3"
  }
}
```

## Wildcards and Subscriptions

NATS supports wildcards for flexible subscriptions:

- `*` - Single token wildcard
- `>` - Multi-token wildcard

### Examples:
- `home.devices.*.*.state` - All device state updates
- `home.devices.sensor.>` - All sensor-related messages
- `home.events.>` - All events
- `home.devices.switch.*.command` - All switch commands

## Request/Reply Pattern

For commands requiring acknowledgment:

1. Client publishes to command subject with reply-to header
2. Device processes command
3. Device publishes response to reply-to subject

Example:
```bash
# Send command with reply
nats request home.devices.switch.light01.command '{"command":"set_state","parameters":{"state":"on"}}'

# Response
{"success":true,"state":"on","timestamp":"2024-01-07T10:30:00Z"}
```

## Best Practices

1. **Use specific subjects** - Avoid overly broad subjects
2. **Include device type** - Enables type-specific subscriptions
3. **Timestamp everything** - Include ISO 8601 timestamps
4. **Version your schemas** - Add schema version to payloads
5. **Use request/reply for commands** - Ensures delivery confirmation
6. **Implement heartbeats** - Regular status updates for device health
7. **Handle reconnections** - Re-announce on connection restore

## Migration Path

For existing MQTT users, here's the mapping:

| MQTT Topic | NATS Subject |
|------------|--------------|
| `home/sensor/temp01` | `home.devices.sensor.temp01.state` |
| `home/switch/light01/set` | `home.devices.switch.light01.command` |
| `homeassistant/discovery` | `home.discovery.announce` |

## Security Considerations

1. Use credentials for authentication
2. Implement subject-based permissions
3. Encrypt sensitive payloads
4. Validate all incoming messages
5. Rate limit command subjects

This schema provides a flexible, scalable foundation for home automation with NATS.