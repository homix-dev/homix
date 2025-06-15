#!/bin/bash

# Add demo devices to NATS KV store
# This script adds some sample devices for testing

NATS_URL=${NATS_URL:-nats://home:changeme@localhost:4222}

echo "Adding demo devices to NATS..."

# Living Room Light
nats --server=$NATS_URL kv put devices living-room-light '{
  "id": "living-room-light",
  "name": "Living Room Light",
  "type": "light",
  "room": "Living Room",
  "manufacturer": "Demo",
  "model": "Smart Bulb v2",
  "online": true,
  "state": {
    "on": false,
    "brightness": 75,
    "color_temp": 3000
  },
  "last_seen": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

# Kitchen Switch
nats --server=$NATS_URL kv put devices kitchen-switch '{
  "id": "kitchen-switch",
  "name": "Kitchen Switch",
  "type": "switch",
  "room": "Kitchen",
  "manufacturer": "Demo",
  "model": "Smart Switch",
  "online": true,
  "state": {
    "on": true
  },
  "last_seen": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

# Temperature Sensor
nats --server=$NATS_URL kv put devices temp-sensor-bedroom '{
  "id": "temp-sensor-bedroom",
  "name": "Bedroom Temperature",
  "type": "sensor",
  "room": "Bedroom",
  "manufacturer": "Demo",
  "model": "Temp/Humidity Sensor",
  "online": true,
  "state": {
    "temperature": 22.5,
    "humidity": 45,
    "battery": 87
  },
  "last_seen": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

# Motion Sensor
nats --server=$NATS_URL kv put devices motion-hallway '{
  "id": "motion-hallway",
  "name": "Hallway Motion",
  "type": "sensor",
  "room": "Hallway",
  "manufacturer": "Demo",
  "model": "PIR Motion Sensor",
  "online": true,
  "state": {
    "motion": false,
    "battery": 92
  },
  "last_seen": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

# Smart Lock
nats --server=$NATS_URL kv put devices front-door-lock '{
  "id": "front-door-lock",
  "name": "Front Door Lock",
  "type": "lock",
  "room": "Entrance",
  "manufacturer": "Demo",
  "model": "Smart Lock Pro",
  "online": true,
  "state": {
    "locked": true,
    "battery": 78
  },
  "last_seen": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

echo "Demo devices added successfully!"

# List devices
echo ""
echo "Current devices in KV store:"
nats --server=$NATS_URL kv ls devices