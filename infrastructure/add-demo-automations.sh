#!/bin/bash

# Add demo automations and scenes to NATS KV store

NATS_URL=${NATS_URL:-nats://home:changeme@localhost:4222}

echo "Adding demo automations..."

# Motion Light Automation
nats --server=$NATS_URL kv put automations motion-light-auto '{
  "id": "motion-light-auto",
  "name": "Motion Activated Lights",
  "description": "Turn on lights when motion is detected",
  "enabled": true,
  "triggers": [{
    "type": "device",
    "device_id": "motion-hallway",
    "attribute": "motion",
    "value": "true"
  }],
  "conditions": [{
    "type": "time",
    "start_time": "18:00",
    "end_time": "06:00"
  }],
  "actions": [{
    "type": "device",
    "device_id": "living-room-light",
    "command": "turn_on",
    "brightness": 100
  }, {
    "type": "delay",
    "duration": 300,
    "unit": "seconds"
  }, {
    "type": "device",
    "device_id": "living-room-light",
    "command": "turn_off"
  }]
}'

# Temperature Alert
nats --server=$NATS_URL kv put automations temp-alert '{
  "id": "temp-alert",
  "name": "High Temperature Alert",
  "description": "Alert when temperature is too high",
  "enabled": true,
  "triggers": [{
    "type": "device",
    "device_id": "temp-sensor-bedroom",
    "attribute": "temperature",
    "operator": "greater_than",
    "value": 26
  }],
  "actions": [{
    "type": "notify",
    "message": "Temperature in bedroom is above 26°C",
    "priority": "high"
  }]
}'

echo "Demo automations added!"

echo -e "\nAdding demo scenes..."

# Night Mode Scene
nats --server=$NATS_URL kv put scenes night-mode '{
  "id": "night-mode",
  "name": "Night Mode",
  "description": "Prepare house for night time",
  "icon": "🌙",
  "actions": [{
    "device_id": "living-room-light",
    "command": "turn_off"
  }, {
    "device_id": "kitchen-switch",
    "command": "turn_off"
  }, {
    "device_id": "front-door-lock",
    "command": "lock"
  }]
}'

# Movie Time Scene
nats --server=$NATS_URL kv put scenes movie-time '{
  "id": "movie-time",
  "name": "Movie Time",
  "description": "Set up living room for watching movies",
  "icon": "🎬",
  "actions": [{
    "device_id": "living-room-light",
    "command": "turn_on",
    "brightness": 10,
    "color_temp": 2700
  }]
}'

# Away Mode Scene
nats --server=$NATS_URL kv put scenes away-mode '{
  "id": "away-mode",
  "name": "Away Mode",
  "description": "Secure house when leaving",
  "icon": "🏃",
  "actions": [{
    "device_id": "living-room-light",
    "command": "turn_off"
  }, {
    "device_id": "kitchen-switch",
    "command": "turn_off"
  }, {
    "device_id": "front-door-lock",
    "command": "lock"
  }]
}'

echo "Demo scenes added!"

echo -e "\nListing automations:"
nats --server=$NATS_URL kv ls automations

echo -e "\nListing scenes:"
nats --server=$NATS_URL kv ls scenes