# Home Assistant ↔ NATS Interaction Examples

This guide shows how to see and control Home Assistant devices from the NATS side using our CLI tool.

## Prerequisites

1. Home Assistant with NATS Bridge integration installed
2. NATS server running
3. Our CLI tool installed (`nats-ha` or run directly)

## Viewing Devices

### List All Devices (Both HA and NATS native)
```bash
# Using our CLI
nats-ha device list

# Or using NATS CLI directly
nats --server=nats://home:changeme@localhost:4222 sub "home.devices.*.*.state"
```

### Monitor Device States in Real-time
```bash
# Watch all device state changes
nats-ha device monitor

# Watch specific device type
nats-ha device monitor --type sensor

# Using NATS CLI for raw messages
nats sub "home.devices.>"
```

## Controlling Devices

### Control a Switch/Light from NATS
```bash
# Turn on a switch
nats-ha device control switch.living_room on

# Turn off
nats-ha device control switch.living_room off

# Toggle
nats-ha device control switch.living_room toggle

# Using NATS CLI directly
echo '{"action": "on"}' | nats pub home.devices.switch.living_room.command
```

### Set Climate/Thermostat
```bash
# Set temperature
nats-ha device control climate.thermostat set_temperature --temp 22

# Or using NATS directly
echo '{"action": "set_temperature", "temperature": 22}' | nats pub home.devices.climate.thermostat.command
```

### Control Covers/Blinds
```bash
# Open cover
nats-ha device control cover.bedroom open

# Set position
nats-ha device control cover.bedroom set_position --position 50
```

## Querying Device Information

### Get Device Details
```bash
# Get device info
nats-ha device get switch.kitchen_light

# Request current state
echo '{"action": "status"}' | nats request home.devices.switch.kitchen_light.command
```

### Get Device Configuration
```bash
# View device config
nats kv get config "device.kitchen_light"
```

## Advanced Scenarios

### 1. Create Virtual Device Visible in HA
```bash
# Announce a virtual temperature sensor
cat <<EOF | nats pub home.discovery.announce
{
  "device_id": "virtual-temp-01",
  "device_type": "sensor",
  "name": "Virtual Temperature",
  "manufacturer": "NATS CLI",
  "model": "Virtual",
  "capabilities": {
    "sensors": ["temperature"],
    "units": {"temperature": "°C"}
  }
}
EOF

# Publish temperature readings
while true; do
  TEMP=$(echo "20 + $RANDOM % 10" | bc)
  echo "{\"device_id\":\"virtual-temp-01\",\"data\":{\"temperature\":$TEMP}}" | \
    nats pub home.devices.sensor.virtual-temp-01.state
  sleep 30
done
```

### 2. Control HA Automation from NATS
```bash
# Trigger HA automation
echo '{"action": "trigger"}' | nats pub home.automation.morning_routine.command

# Enable/disable automation
echo '{"action": "enable"}' | nats pub home.automation.vacation_mode.command
```

### 3. Group Control
```bash
# Control all lights in a room
echo '{"action": "on", "brightness": 80}' | nats pub home.devices.light.living_room.*.command

# Turn off all switches
echo '{"action": "off"}' | nats pub home.devices.switch.*.command
```

### 4. Scene Activation
```bash
# Activate a scene
echo '{"scene": "movie_night"}' | nats pub home.scenes.activate

# Or specific room scene
echo '{"action": "activate"}' | nats pub home.scenes.living_room.movie.command
```

## Using the TUI

Our TUI provides an interactive way to control devices:

```bash
# Launch TUI
nats-ha tui
```

In the TUI you can:
- Browse all devices
- See real-time state updates
- Send commands with a friendly interface
- View device history

## Scripting Examples

### Bash Script to Toggle Lights at Sunset
```bash
#!/bin/bash
# toggle-sunset-lights.sh

LIGHTS=("porch" "garden" "pathway")

for light in "${LIGHTS[@]}"; do
  echo '{"action": "on"}' | nats pub home.devices.light.$light.command
done
```

### Python Script for Temperature Monitoring
```python
#!/usr/bin/env python3
import asyncio
import json
import nats

async def monitor_temperature():
    nc = await nats.connect("nats://home:changeme@localhost:4222")
    
    async def temp_handler(msg):
        data = json.loads(msg.data.decode())
        temp = data['data']['temperature']
        device = data['device_id']
        
        if temp > 25:
            # Turn on AC
            await nc.publish(
                f"home.devices.climate.{device.replace('sensor', 'ac')}.command",
                json.dumps({"action": "cool", "temperature": 22}).encode()
            )
    
    await nc.subscribe("home.devices.sensor.*.state", cb=temp_handler)
    
    # Keep running
    await asyncio.Event().wait()

if __name__ == "__main__":
    asyncio.run(monitor_temperature())
```

## Debugging

### View Raw Messages
```bash
# See all NATS traffic
nats sub ">"

# See only device messages
nats sub "home.devices.>"

# See discovery announcements
nats sub "home.discovery.>"
```

### Test Device Response
```bash
# Send test command and wait for response
echo '{"action": "status"}' | nats request home.devices.switch.test.command --timeout=5s
```

## Integration with Home Assistant

The beauty of our system is that:
1. **Any device in HA** automatically appears on NATS (if you enable state publishing)
2. **Any device announced on NATS** automatically appears in HA
3. **Commands work bidirectionally** - control from either side
4. **State synchronization** is real-time in both directions

### Example: Philips Hue Bridge
If you have Hue lights in HA:
```bash
# They appear on NATS as
home.devices.light.hue_bedroom.state
home.devices.light.hue_bedroom.command

# Control them
echo '{"action": "on", "brightness": 100, "color": "blue"}' | \
  nats pub home.devices.light.hue_bedroom.command
```

### Example: Z-Wave Devices
Z-Wave devices in HA also work:
```bash
# Monitor Z-Wave sensor
nats sub "home.devices.binary_sensor.zwave_motion_*.state"

# Control Z-Wave switch  
echo '{"action": "on"}' | nats pub home.devices.switch.zwave_outlet.command
```