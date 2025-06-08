# NATS Messaging Pattern Examples

This directory contains examples demonstrating the core messaging patterns for the NATS home automation system.

## Prerequisites

1. NATS server running locally (see ../README.md)
2. NATS CLI installed
3. Python 3.8+ (for Python examples)

## Setup

Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Examples

### 1. CLI Examples (nats-cli-examples.sh)

Interactive shell script demonstrating NATS CLI usage:
```bash
./nats-cli-examples.sh
```

This covers:
- Basic connectivity testing
- Creating JetStream streams
- Publishing/subscribing to topics
- KV store operations
- Wildcard subscriptions

### 2. Python Messaging Patterns (messaging-patterns.py)

Python implementation of all core patterns:
```bash
python messaging-patterns.py
```

Demonstrates:
- Device state publishing
- Request/reply for commands
- Device discovery
- Event publishing
- KV store configuration
- Service health checks

## Quick Test Commands

### Subscribe to all device states:
```bash
nats sub 'home.devices.*.*.state' -s nats://home:changeme@localhost:4222
```

### Publish a test sensor reading:
```bash
echo '{"temperature": 22.5, "humidity": 45}' | nats pub home.devices.sensor.test01.state -s nats://home:changeme@localhost:4222
```

### Test request/reply:
```bash
# Terminal 1 - Mock device responder
nats reply 'home.devices.switch.*.command' '{"success":true,"state":"on"}' -s nats://home:changeme@localhost:4222

# Terminal 2 - Send command
nats request home.devices.switch.light01.command '{"command":"set_state","parameters":{"state":"on"}}' -s nats://home:changeme@localhost:4222
```

## Next Steps

After understanding these patterns:
1. Build the device discovery service
2. Create ESPHome NATS components
3. Implement Home Assistant bridge

See the main ACTION_PLAN.md for the complete roadmap.