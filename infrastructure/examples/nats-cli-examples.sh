#!/bin/bash

# NATS CLI Examples for Home Automation
# 
# This script demonstrates basic NATS operations using the CLI
# Make sure NATS CLI is installed and NATS server is running

# Configuration
NATS_URL="nats://home:changeme@localhost:4222"

echo "=== NATS Home Automation CLI Examples ==="
echo "Using server: $NATS_URL"
echo

# Helper function for pausing between examples
pause() {
    echo
    echo "Press Enter to continue..."
    read
}

# 1. Basic connectivity test
echo "1. Testing NATS connectivity..."
nats server info -s $NATS_URL
pause

# 2. Create JetStream streams for persistent messaging
echo "2. Creating JetStream stream for device states..."
nats stream add DEVICE_STATES \
    --subjects "home.devices.*.*.state" \
    --retention limits \
    --max-age 7d \
    --max-msgs 100000 \
    --max-bytes 1GB \
    --storage file \
    --replicas 1 \
    -s $NATS_URL
pause

# 3. Subscribe to all device state updates
echo "3. Subscribing to all device states (run in another terminal):"
echo "nats sub 'home.devices.*.*.state' -s $NATS_URL"
echo
echo "Example subscription command:"
echo "nats sub 'home.devices.sensor.*.state' -s $NATS_URL"
pause

# 4. Publish a sensor state update
echo "4. Publishing sensor state update..."
SENSOR_STATE='{
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
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
}'

echo "$SENSOR_STATE" | nats pub home.devices.sensor.temp01.state -s $NATS_URL
pause

# 5. Device discovery announcement
echo "5. Announcing a new device..."
DEVICE_ANNOUNCE='{
    "device_id": "motion01",
    "device_type": "binary_sensor",
    "manufacturer": "Generic",
    "model": "PIR01",
    "name": "Hallway Motion",
    "capabilities": {
        "sensors": ["motion"],
        "attributes": ["battery", "tamper"]
    },
    "topics": {
        "state": "home.devices.binary_sensor.motion01.state",
        "status": "home.devices.binary_sensor.motion01.status"
    }
}'

echo "$DEVICE_ANNOUNCE" | nats pub home.discovery.announce -s $NATS_URL
pause

# 6. Request/Reply pattern for commands
echo "6. Demonstrating request/reply pattern..."
echo "First, let's create a mock device that responds to commands:"
echo
echo "In another terminal, run:"
echo "nats reply 'home.devices.switch.*.command' '{\"success\":true,\"state\":\"on\"}' -s $NATS_URL"
echo
echo "Then send a command:"
echo "nats request home.devices.switch.light01.command '{\"command\":\"set_state\",\"parameters\":{\"state\":\"on\"}}' -s $NATS_URL"
pause

# 7. KV Store operations
echo "7. Working with KV store for configuration..."

# Create KV bucket
echo "Creating device_configs KV bucket..."
nats kv add device_configs -s $NATS_URL

# Store device configuration
echo "Storing device configuration..."
DEVICE_CONFIG='{
    "name": "Living Room Light",
    "type": "dimmer",
    "min_brightness": 10,
    "max_brightness": 100,
    "transition_time": 2
}'

echo "$DEVICE_CONFIG" | nats kv put device_configs device.light01 -s $NATS_URL

# Retrieve configuration
echo "Retrieving device configuration..."
nats kv get device_configs device.light01 -s $NATS_URL
pause

# 8. System events
echo "8. Publishing system events..."
EVENT='{
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "event_type": "service_started",
    "service": "cli-examples",
    "data": {
        "version": "1.0.0",
        "pid": '$$'
    }
}'

echo "$EVENT" | nats pub home.events.system.service_started -s $NATS_URL
pause

# 9. Wildcards demonstration
echo "9. Wildcard subscription examples:"
echo
echo "Subscribe to all device messages:"
echo "nats sub 'home.devices.>' -s $NATS_URL"
echo
echo "Subscribe to all sensor states:"
echo "nats sub 'home.devices.sensor.*.state' -s $NATS_URL"
echo
echo "Subscribe to all events:"
echo "nats sub 'home.events.>' -s $NATS_URL"
echo
echo "Subscribe to all switch commands:"
echo "nats sub 'home.devices.switch.*.command' -s $NATS_URL"
pause

# 10. Stream consumer
echo "10. Creating JetStream consumer for device states..."
nats consumer add DEVICE_STATES STATE_PROCESSOR \
    --filter "home.devices.sensor.*.state" \
    --ack explicit \
    --deliver all \
    --replay instant \
    --max-deliver 3 \
    -s $NATS_URL

echo
echo "Consume messages:"
echo "nats consumer next DEVICE_STATES STATE_PROCESSOR --count 10 -s $NATS_URL"
pause

# 11. Monitoring
echo "11. Monitoring commands:"
echo
echo "View all streams:"
echo "nats stream list -s $NATS_URL"
echo
echo "View stream info:"
echo "nats stream info DEVICE_STATES -s $NATS_URL"
echo
echo "View consumers:"
echo "nats consumer list DEVICE_STATES -s $NATS_URL"
echo
echo "Server stats:"
echo "nats server report connections -s $NATS_URL"
echo

echo "=== Examples completed ==="
echo
echo "Useful commands to remember:"
echo "- nats sub <subject> -s $NATS_URL"
echo "- nats pub <subject> <message> -s $NATS_URL"
echo "- nats request <subject> <message> -s $NATS_URL"
echo "- nats kv get/put <bucket> <key> -s $NATS_URL"
echo "- nats stream/consumer commands for JetStream"