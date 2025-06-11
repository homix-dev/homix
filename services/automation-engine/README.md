# Automation Engine

The automation engine monitors device states and executes automation rules for the NATS Home Automation system.

## Features

- **Trigger Types**:
  - Device state changes
  - Time-based triggers
  - Event-based triggers

- **Condition Types**:
  - Device state conditions
  - Time range conditions
  - Numeric comparisons
  - Weekday conditions

- **Action Types**:
  - Device commands
  - Scene activation
  - Notifications

## Configuration

Create a `config.yaml` file:

```yaml
nats:
  url: nats://localhost:4222
  # creds: /path/to/nats.creds  # Optional

engine:
  update_interval: 30  # How often to reload automations (seconds)
  debug_evaluation: false  # Enable debug logging for automation evaluation

debug: false  # Enable debug logging
```

## Running

```bash
# Build and run
task run

# Run with hot reload
task dev

# Run with custom config
./automation-engine --config /path/to/config.yaml
```

## How It Works

1. The engine connects to NATS and loads automations from the `automations` KV store
2. It subscribes to device state changes on `home.devices.*.*.state`
3. When a device state changes, it evaluates all automations with matching triggers
4. If triggers match and all conditions pass, it executes the automation actions
5. Actions are executed by publishing commands to the appropriate NATS subjects

## Automation Example

```json
{
  "id": "auto_123",
  "name": "Turn on lights when motion detected",
  "enabled": true,
  "triggers": [
    {
      "type": "device_state",
      "device_id": "motion_sensor_1",
      "attribute": "motion",
      "value": true
    }
  ],
  "conditions": [
    {
      "type": "time",
      "after": "17:00",
      "before": "23:00"
    }
  ],
  "actions": [
    {
      "type": "device_command",
      "device_id": "light_1",
      "command": "turn_on",
      "data": {
        "brightness": 80
      }
    }
  ]
}
```

## Development

```bash
# Install dependencies
task deps

# Run tests
task test

# Build Docker image
task docker:build
```