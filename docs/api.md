# NATS Subject Schema API

This document defines the NATS subject naming conventions and message formats used in the home automation system.

## Subject Hierarchy

### Device Subjects

#### State Publishing
```
home.devices.{type}.{id}.state
```

**Purpose**: Devices publish their current state  
**Publishers**: Devices  
**Subscribers**: Home Assistant, monitoring services, automation engine

**Message Format**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "device_id": "temp01",
  "type": "sensor",
  "state": {
    "temperature": 22.5,
    "humidity": 45.2,
    "battery": 85
  },
  "attributes": {
    "unit": "celsius",
    "location": "living_room"
  }
}
```

#### Command Requests
```
home.devices.{type}.{id}.set
```

**Purpose**: Send commands to devices  
**Pattern**: Request-Reply  
**Timeout**: 5 seconds

**Request Format**:
```json
{
  "command": "set_state",
  "value": "on",
  "parameters": {
    "brightness": 75,
    "color_temp": 3000
  }
}
```

**Reply Format**:
```json
{
  "success": true,
  "device_id": "light01",
  "new_state": "on",
  "execution_time_ms": 125
}
```

#### Health Monitoring
```
home.devices.{type}.{id}.health
```

**Purpose**: Device health metrics  
**Interval**: Every 60 seconds

**Message Format**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "device_id": "switch01",
  "uptime_seconds": 86400,
  "free_heap": 45632,
  "wifi_rssi": -65,
  "message_count": 1523,
  "error_count": 0,
  "last_error": null
}
```

### Discovery Subjects

#### Device Announcement
```
home.discovery.announce
```

**Purpose**: New devices announce their presence  
**Publishers**: Devices on boot/reconnect  
**Subscribers**: Discovery service

**Message Format**:
```json
{
  "device_id": "temp01",
  "type": "sensor",
  "manufacturer": "DIY",
  "model": "ESP32-DHT22",
  "sw_version": "1.0.0",
  "capabilities": [
    {
      "type": "sensor",
      "name": "temperature",
      "unit": "°C",
      "min": -40,
      "max": 80
    },
    {
      "type": "sensor",
      "name": "humidity",
      "unit": "%",
      "min": 0,
      "max": 100
    }
  ],
  "subjects": {
    "state": "home.devices.sensor.temp01.state",
    "health": "home.devices.sensor.temp01.health",
    "config": "home.devices.sensor.temp01.config"
  }
}
```

#### Device Removal
```
home.discovery.remove
```

**Purpose**: Notify system of device removal  
**Publishers**: Admin tools, devices  

**Message Format**:
```json
{
  "device_id": "temp01",
  "reason": "user_requested",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Event Subjects

#### State Changes
```
home.events.state_changed
```

**Purpose**: Notify subscribers of state changes  
**Publishers**: State management service  

**Message Format**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "device_id": "light01",
  "entity_id": "light.living_room",
  "old_state": "off",
  "new_state": "on",
  "attributes": {
    "brightness": 75,
    "triggered_by": "automation.sunset"
  }
}
```

#### Automation Triggers
```
home.events.automation.{trigger_type}
```

**Purpose**: Automation system events  
**Types**: time, state, numeric_state, template, event

**Message Format**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "trigger_id": "sunset_lights",
  "trigger_type": "time",
  "conditions_met": true,
  "actions_executed": [
    "light.living_room.turn_on",
    "light.kitchen.turn_on"
  ]
}
```

### Configuration Subjects

#### Device Configuration
```
home.config.device.{id}
```

**Purpose**: Store device configurations  
**Storage**: NATS KV Store  
**Watchers**: Devices subscribe to changes

**Value Format**:
```json
{
  "version": 2,
  "device_id": "temp01",
  "updated_at": "2024-01-15T10:30:00Z",
  "updated_by": "admin",
  "config": {
    "reporting_interval": 30,
    "temperature_offset": -0.5,
    "humidity_offset": 2.0,
    "location": "living_room",
    "enabled": true
  }
}
```

#### Automation Rules
```
home.config.automation.{id}
```

**Purpose**: Store automation rules  
**Storage**: NATS KV Store  

**Value Format**:
```json
{
  "version": 1,
  "automation_id": "sunset_lights",
  "name": "Turn on lights at sunset",
  "enabled": true,
  "trigger": {
    "platform": "sun",
    "event": "sunset",
    "offset": "-00:30:00"
  },
  "conditions": [
    {
      "condition": "state",
      "entity_id": "person.home",
      "state": "home"
    }
  ],
  "actions": [
    {
      "service": "light.turn_on",
      "target": {
        "entity_id": ["light.living_room", "light.kitchen"]
      },
      "data": {
        "brightness_pct": 75
      }
    }
  ]
}
```

## Request-Reply Patterns

### Device Commands

**Request Subject**: `home.devices.{type}.{id}.set`  
**Reply Subject**: Auto-generated inbox

**Example**:
```bash
# Send command
nats request home.devices.switch.outlet01.set '{"command":"set_state","value":"on"}' --timeout 5s

# Device responds
{"success":true,"device_id":"outlet01","new_state":"on"}
```

### Service Queries

**Request Subject**: `home.service.{service}.query`  
**Reply Subject**: Auto-generated inbox

**Example**:
```bash
# Query all devices
nats request home.service.discovery.query '{"type":"list_devices"}'

# Service responds with device list
{"devices":[{"id":"temp01","type":"sensor","online":true}]}
```

## Stream Configuration

### Device State Stream
```bash
nats stream add DEVICE_STATES \
  --subjects "home.devices.*.*.state" \
  --storage file \
  --retention limits \
  --max-msgs-per-subject 1000 \
  --max-age 7d \
  --max-bytes 1G
```

### Event Stream
```bash
nats stream add EVENTS \
  --subjects "home.events.>" \
  --storage file \
  --retention limits \
  --max-age 30d \
  --max-bytes 10G
```

### Command Audit Stream
```bash
nats stream add COMMANDS \
  --subjects "home.devices.*.*.set" \
  --storage file \
  --retention limits \
  --max-age 90d
```

## KV Bucket Configuration

### Device Registry
```bash
nats kv add DEVICES \
  --storage file \
  --history 10 \
  --ttl 0 \
  --max-value-size 10240
```

### Configuration Store
```bash
nats kv add CONFIG \
  --storage file \
  --history 50 \
  --ttl 0 \
  --max-value-size 102400
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "DEVICE_OFFLINE",
    "message": "Device is not responding",
    "device_id": "switch01",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes
- `DEVICE_OFFLINE`: Device not responding
- `INVALID_COMMAND`: Command not recognized
- `INVALID_PARAMETER`: Invalid parameter value
- `UNAUTHORIZED`: Insufficient permissions
- `TIMEOUT`: Request timeout
- `INTERNAL_ERROR`: Device internal error

## Best Practices

1. **Subject Naming**:
   - Use lowercase with dots as separators
   - Include device type and ID in subjects
   - Keep hierarchy consistent

2. **Message Format**:
   - Always include timestamp in ISO 8601 format
   - Use JSON for all messages
   - Include device_id in every message

3. **Error Handling**:
   - Always respond to request-reply
   - Include meaningful error messages
   - Log errors for debugging

4. **Performance**:
   - Batch related messages when possible
   - Use appropriate retention policies
   - Monitor message rates

5. **Security**:
   - Use subject-based permissions
   - Validate all input data
   - Don't expose sensitive information