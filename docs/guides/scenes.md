# Scenes Guide

Scenes allow you to control multiple devices with a single command, perfect for creating ambiances or managing groups of devices together.

## Overview

A scene is a saved configuration of device states that can be activated with a single action. When activated, all devices in the scene are commanded to their configured states simultaneously.

## Scene Structure

```json
{
  "id": "evening-lights",
  "name": "Evening Lights",
  "description": "Cozy evening lighting setup",
  "entities": [
    {
      "device_id": "living-room-light",
      "state": {
        "state": "on",
        "brightness": 70,
        "color_temp": 3000
      }
    },
    {
      "device_id": "bedroom-light",
      "state": {
        "state": "on", 
        "brightness": 40
      }
    }
  ],
  "created_at": "2024-01-15T20:00:00Z",
  "updated_at": "2024-01-15T20:00:00Z"
}
```

## Creating Scenes

### Via Web UI

1. Navigate to the Scenes page in the Management UI
2. Click "Create Scene"
3. Configure:
   - Scene name and description
   - Select devices to include
   - Set desired state for each device
4. Save the scene

### Via API

```bash
curl -X POST http://localhost:8081/api/v1/scenes \
  -H "Content-Type: application/json" \
  -d '{
    "id": "morning-routine",
    "name": "Morning Routine",
    "description": "Wake up lighting and devices",
    "entities": [
      {
        "device_id": "bedroom-light",
        "state": {"state": "on", "brightness": 100}
      },
      {
        "device_id": "coffee-maker",
        "state": {"state": "on"}
      }
    ]
  }'
```

## Activating Scenes

### Manual Activation

#### Via Web UI
- Click the "Activate" button on any scene card

#### Via API
```bash
curl -X POST http://localhost:8081/api/v1/scenes/morning-routine/activate
```

#### Via NATS
```bash
nats pub home.scenes.morning-routine.activate '{}'
```

### Automated Activation

Scenes can be activated through automations using the visual designer:

1. Add an "Activate Scene" action node
2. Configure the scene ID
3. Connect to triggers like:
   - Time-based triggers
   - Device state changes
   - NATS events
   - Sunrise/sunset

Example automation flow:
```
[Time Trigger: 7:00 AM] → [Activate Scene: morning-routine]
```

## Scene Management

### List All Scenes
```bash
curl http://localhost:8081/api/v1/scenes
```

### Get Scene Details
```bash
curl http://localhost:8081/api/v1/scenes/evening-lights
```

### Update Scene
```bash
curl -X PUT http://localhost:8081/api/v1/scenes/evening-lights \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Evening Lights", ...}'
```

### Delete Scene
```bash
curl -X DELETE http://localhost:8081/api/v1/scenes/evening-lights
```

## Advanced Features

### Scene Variables

Scenes support dynamic values using variables:

```json
{
  "device_id": "living-room-light",
  "state": {
    "state": "on",
    "brightness": "{{brightness_level}}",
    "color_temp": "{{time_of_day == 'evening' ? 2700 : 5000}}"
  }
}
```

### Scene Transitions

For smooth transitions, devices that support it will fade between states:

```json
{
  "device_id": "dimmable-light",
  "state": {
    "state": "on",
    "brightness": 80,
    "transition": 2000  // 2 second fade
  }
}
```

### Conditional Scenes

Scenes can include conditions that are evaluated at activation time:

```json
{
  "device_id": "outdoor-light",
  "state": {
    "state": "on"
  },
  "condition": {
    "after_sunset": true
  }
}
```

## Integration with Automations

### Scene as Trigger

Monitor when scenes are activated:

```
[NATS Event: home.scenes.activated] → [Send Notification]
```

### Scene Chaining

Create complex scenarios by chaining scenes:

```
[Activate Scene: arriving-home] → [Delay: 5min] → [Activate Scene: evening-lights]
```

### Dynamic Scene Selection

Use logic nodes to select scenes based on conditions:

```
[Time Trigger] → [Switch: time_of_day]
  ├─ morning → [Activate Scene: morning-routine]
  ├─ evening → [Activate Scene: evening-lights]
  └─ night → [Activate Scene: night-mode]
```

## Best Practices

1. **Naming Convention**: Use descriptive names that indicate when/where the scene is used
   - Good: `living-room-movie-time`, `bedroom-sleep-mode`
   - Bad: `scene1`, `lights`

2. **Group by Purpose**: Organize scenes by their use case
   - Time-based: morning, evening, night
   - Activity-based: movie, dinner, party
   - Location-based: living-room, bedroom, outdoor

3. **Test Before Automating**: Always test scenes manually before adding to automations

4. **Document Complex Scenes**: Use the description field to explain what the scene does

5. **Version Control**: Export important scenes to JSON files for backup

## Troubleshooting

### Scene Not Activating

1. Check device availability:
   ```bash
   curl http://localhost:8081/api/v1/devices
   ```

2. Monitor NATS messages:
   ```bash
   nats sub "home.scenes.>"
   ```

3. Check Management UI logs:
   ```bash
   task logs service=management-ui
   ```

### Devices Not Responding

1. Verify device is online and announcing
2. Check device supports the commanded states
3. Monitor device command subjects:
   ```bash
   nats sub "home.devices.*.*.command"
   ```

### Scene Partially Working

This usually means some devices in the scene are offline or don't support the requested states. The scene will attempt to control all devices but only online devices will respond.

## Example Scenes

### Movie Time
```json
{
  "id": "movie-time",
  "name": "Movie Time",
  "entities": [
    {"device_id": "tv", "state": {"state": "on", "input": "hdmi1"}},
    {"device_id": "living-room-lights", "state": {"state": "on", "brightness": 20}},
    {"device_id": "blinds", "state": {"position": 0}}
  ]
}
```

### Good Night
```json
{
  "id": "good-night", 
  "name": "Good Night",
  "entities": [
    {"device_id": "all-lights", "state": {"state": "off"}},
    {"device_id": "door-lock", "state": {"locked": true}},
    {"device_id": "thermostat", "state": {"mode": "sleep", "target_temp": 68}}
  ]
}
```

### Party Mode
```json
{
  "id": "party-mode",
  "name": "Party Mode",
  "entities": [
    {"device_id": "color-lights", "state": {"state": "on", "effect": "colorloop"}},
    {"device_id": "music-system", "state": {"state": "on", "volume": 70}},
    {"device_id": "outdoor-lights", "state": {"state": "on", "brightness": 100}}
  ]
}
```