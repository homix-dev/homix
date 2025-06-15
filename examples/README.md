# NATS Home Automation Examples

This directory contains example code for various aspects of the NATS Home Automation system.

## JWT Authentication Examples

### Device with JWT Credentials

The `jwt-device-example.go` demonstrates how to create a device that:
- Connects to NATS using JWT credentials
- Announces itself to the discovery service
- Responds to commands
- Publishes state updates
- Handles graceful shutdown

**Prerequisites**:
1. Generate device credentials using the setup script:
   ```bash
   cd infrastructure
   ./setup-synadia-cloud.sh
   ```

2. Or provision a new device:
   ```bash
   nats request home.provisioning.request '{
     "device_id": "example-light-001",
     "device_type": "light",
     "name": "Example Light"
   }'
   ```

**Running the example**:
```bash
# Using credentials file
go run jwt-device-example.go ./infrastructure/creds/device-light-001.creds

# Or with environment variable
export DEVICE_CREDS=./infrastructure/creds/device-light-001.creds
export DEVICE_ID=kitchen-light
go run jwt-device-example.go
```

**Testing the device**:
```bash
# Turn on the light
nats pub home.devices.light.example-light-001.command '{"state": "on"}'

# Set brightness
nats pub home.devices.light.example-light-001.command '{"brightness": 50}'

# Subscribe to state updates
nats sub "home.devices.light.example-light-001.state"
```

## Basic Authentication Examples (Legacy)

For examples using basic authentication, see:
- `infrastructure/test_nats_discovery.py` - Python device example
- ESPHome configurations in `esphome/` directory

## Scene Examples

See `examples/scene-with-automation.json` for an example of:
- Scene definitions
- Automation triggers
- Complex device orchestration

## Migration Examples

For migrating from basic auth to JWT:

1. **Gradual Migration**: Keep both auth methods active
   ```go
   // Old connection
   nc, _ := nats.Connect("nats://home:changeme@localhost:4222")
   
   // New connection with JWT
   nc, _ := nats.Connect("nats://localhost:4222",
       nats.UserCredentials("device.creds"))
   ```

2. **Environment-based Selection**:
   ```go
   var nc *nats.Conn
   var err error
   
   if credsFile := os.Getenv("NATS_CREDS"); credsFile != "" {
       // Use JWT auth
       nc, err = nats.Connect(natsURL, nats.UserCredentials(credsFile))
   } else {
       // Fall back to basic auth
       nc, err = nats.Connect(natsURL)
   }
   ```

## Testing

### Manual Testing
```bash
# Test device discovery
nats sub "home.discovery.>"

# Test device commands
nats request home.devices.light.test.command '{"state": "on"}' --timeout=2s

# Monitor all device activity
nats sub "home.devices.>"
```

### Load Testing
```bash
# Simulate multiple devices
for i in {1..10}; do
    DEVICE_ID="test-light-$i" go run jwt-device-example.go &
done
```

## Security Notes

1. **Never commit credentials** to version control
2. **Store device seeds securely** on each device
3. **Use unique credentials** for each device
4. **Implement credential rotation** for production
5. **Monitor authentication failures** in NATS logs

## Next Steps

- Implement your own device using the JWT example as a template
- Create device-specific examples for your hardware
- Add examples for complex automations
- Contribute examples back to the project!