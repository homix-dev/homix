# Testing the Discovery Service

This guide will help you test the discovery service and configuration management features.

## Prerequisites

1. NATS server running with JetStream enabled
2. Go 1.21+ installed
3. NATS CLI installed

## Quick Start

### 1. Start NATS Server

```bash
# From project root
task infra:start-dev
```

### 2. Build and Run Discovery Service

In terminal 1:
```bash
# From project root
task services:discovery:run

# Or with hot reload for development
task services:discovery:dev
```

### 3. Run Automated Tests

In terminal 2:
```bash
# Run unit tests
task services:discovery:test

# Run integration tests (requires NATS server running)
task services:discovery:test-integration
```

This will run a comprehensive test suite covering:
- Device registration
- Configuration management
- Backup/restore
- Service health checks

## Manual Testing

### Monitor Events

In a separate terminal, subscribe to all events:
```bash
nats sub 'home.events.>' -s nats://home:changeme@localhost:4222
```

### Test Device Discovery

1. **Announce a device:**
```bash
nats pub home.discovery.announce '{
  "device_id": "kitchen-temp",
  "device_type": "sensor",
  "name": "Kitchen Temperature",
  "capabilities": {
    "sensors": ["temperature", "humidity"]
  }
}'
```

2. **List all devices:**
```bash
nats request home.discovery.request ''
```

3. **Get specific device:**
```bash
nats request home.services.discovery.command '{
  "command": "get_device",
  "params": {"device_id": "kitchen-temp"}
}'
```

### Test Configuration Management

1. **Set device configuration:**
```bash
nats request home.services.config.command '{
  "command": "set_device_config",
  "params": {
    "device_type": "sensor",
    "config": {
      "device_id": "kitchen-temp",
      "name": "Kitchen Temperature",
      "enabled": true,
      "settings": {
        "update_interval": 30,
        "calibration_offset": -0.5
      },
      "thresholds": {
        "temperature": {
          "min": 15,
          "max": 30,
          "action": "notify"
        }
      }
    }
  }
}'
```

2. **Get configuration:**
```bash
nats request home.config.device.kitchen-temp ''
```

3. **Create backup:**
```bash
nats request home.services.config.command '{
  "command": "create_backup",
  "params": {"description": "Test backup"}
}'
```

### Test with Multiple Devices

Run the example patterns:
```bash
# From project root
cd infrastructure/examples

# Test basic patterns
python3 messaging-patterns.py
```

For more examples, see the [NATS CLI Examples](../../docs/nats-cli-examples.md) documentation.

## Debugging

### View Service Logs

If running with systemd:
```bash
journalctl -u discovery -f
```

If running manually:
```bash
# Logs are printed to stdout when using --debug flag
```

### Check KV Store Contents

List all KV buckets:
```bash
nats kv list
```

View device registry:
```bash
nats kv get device_registry --all
```

View configurations:
```bash
nats kv get device_configs --all
```

### Common Issues

1. **Service won't start**
   - Check NATS connectivity: `nats server info`
   - Verify credentials in discovery.yaml
   - Check port 4222 is not blocked

2. **Devices not persisting**
   - Ensure JetStream is enabled
   - Check KV bucket exists: `nats kv list`
   - Verify write permissions

3. **Configuration validation failing**
   - Check device type has a schema defined
   - Verify required fields are present
   - Use `--debug` flag for detailed errors

## Performance Testing

For load testing with many devices:

```bash
# Announce 100 devices
for i in {1..100}; do
  nats pub home.discovery.announce "{
    \"device_id\": \"sensor-$i\",
    \"device_type\": \"sensor\",
    \"name\": \"Sensor $i\"
  }"
done

# Check stats
nats request home.services.discovery.command '{"command":"get_stats"}'
```

## Next Steps

After testing the discovery service:
1. Move on to Phase 2: ESPHome NATS Components
2. Set up real devices to use the discovery service
3. Integrate with Home Assistant bridge