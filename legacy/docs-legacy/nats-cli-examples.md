# NATS CLI Examples for Home Automation

This guide demonstrates basic NATS operations using the CLI for the home automation system.

## Prerequisites

- NATS CLI installed (`go install github.com/nats-io/natscli/nats@latest`)
- NATS server running (`task infra:start-dev`)

## Configuration

Default connection:
```bash
NATS_URL="nats://home:changeme@localhost:4222"
```

## Examples

### 1. Testing NATS Connectivity

```bash
# Check server info
nats server info -s $NATS_URL

# Check connection
nats server check connection -s $NATS_URL
```

### 2. Creating JetStream Streams

Create persistent storage for device states:

```bash
nats stream add DEVICE_STATES \
    --subjects "home.devices.*.*.state" \
    --retention limits \
    --max-age 7d \
    --max-msgs 100000 \
    --max-bytes 1GB \
    --storage file \
    --replicas 1 \
    -s $NATS_URL
```

### 3. Subscribing to Device Updates

```bash
# Subscribe to all device states
nats sub 'home.devices.*.*.state' -s $NATS_URL

# Subscribe to specific device type
nats sub 'home.devices.sensor.*.state' -s $NATS_URL

# Subscribe to discovery announcements
nats sub 'home.discovery.announce' -s $NATS_URL
```

### 4. Publishing Device States

```bash
# Sensor state update
SENSOR_STATE='{
  "device_id": "temp-sensor-01",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "data": {
    "temperature": 22.5,
    "humidity": 45.2
  }
}'
echo "$SENSOR_STATE" | nats pub home.devices.sensor.temp-sensor-01.state -s $NATS_URL

# Switch state update
SWITCH_STATE='{
  "device_id": "switch-01",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "state": "on",
  "power": 125.5
}'
echo "$SWITCH_STATE" | nats pub home.devices.switch.switch-01.state -s $NATS_URL
```

### 5. Device Discovery

```bash
# Announce a new device
DEVICE_ANNOUNCE='{
  "device_id": "new-sensor-01",
  "device_type": "sensor",
  "name": "Living Room Temperature",
  "manufacturer": "DIY",
  "model": "DHT22",
  "capabilities": {
    "sensors": ["temperature", "humidity"]
  }
}'
echo "$DEVICE_ANNOUNCE" | nats pub home.discovery.announce -s $NATS_URL

# Request all devices
nats request home.discovery.request '' -s $NATS_URL
```

### 6. Key-Value Store Operations

```bash
# Create KV bucket for device registry
nats kv add device_registry -s $NATS_URL

# Store device info
echo '{"name": "Kitchen Light", "type": "switch"}' | \
    nats kv put device_registry device.switch.kitchen-light -s $NATS_URL

# Get device info
nats kv get device_registry device.switch.kitchen-light -s $NATS_URL

# List all devices
nats kv ls device_registry -s $NATS_URL
```

### 7. Request-Reply Pattern

```bash
# Send command to a device
COMMAND='{"action": "turn_on", "brightness": 80}'
nats request home.devices.light.living-room-01.command "$COMMAND" \
    --timeout 5s -s $NATS_URL
```

### 8. Monitoring and Debugging

```bash
# Monitor all home automation messages
nats sub 'home.>' -s $NATS_URL

# View stream info
nats stream info DEVICE_STATES -s $NATS_URL

# View consumer info
nats consumer info DEVICE_STATES <consumer-name> -s $NATS_URL

# Benchmark publish performance
nats bench home.test --msgs 1000 --size 256 -s $NATS_URL
```

## Using with Task

These examples are integrated into the Taskfile:

```bash
# Monitor all messages
task monitor

# Monitor discovery
task monitor-discovery

# Send test announcement
task announce-test

# List devices
task devices-list
```

## Advanced Patterns

### Filtered Subscriptions

```bash
# Only temperature sensors
nats sub 'home.devices.sensor.*.state' \
    --match 'temperature' -s $NATS_URL

# Only devices in specific room
nats sub 'home.devices.*.*.state' \
    --match 'kitchen' -s $NATS_URL
```

### Stream Templates

```bash
# Create a stream template for per-device streams
nats stream template add DEVICE_STREAMS \
    --subjects 'home.devices.{{device_type}}.{{device_id}}.>' \
    --max-age 30d \
    -s $NATS_URL
```