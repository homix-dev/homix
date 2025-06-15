# Migration Guide: Local to Cloud Architecture

This guide walks through migrating from the current local-only deployment to the target cloud-first architecture with Synadia Cloud.

## Overview

The migration preserves full functionality while adding:
- Cloud-based management
- Per-device JWT authentication
- Multi-home support
- Enhanced security
- Remote access capabilities

## Prerequisites

Before starting the migration:

1. **Install Required Tools**:
   ```bash
   # Install NSC (NATS account management)
   curl -L https://raw.githubusercontent.com/nats-io/nsc/master/install.sh | sh
   
   # Install NATS CLI
   # Download from: https://github.com/nats-io/natscli/releases
   ```

2. **Sign up for Synadia Cloud** (optional but recommended):
   - Visit https://app.ngs.global
   - Create a free account
   - You can also run fully local with JWT auth

## Phase 1: Local JWT Authentication (No Cloud Required)

This phase adds JWT authentication while keeping everything local.

### Step 1: Generate JWT Credentials

```bash
# Run the setup script
cd infrastructure
./setup-synadia-cloud.sh
```

This creates:
- Local operator and account
- Service user credentials
- Sample device credentials
- Docker Compose override file

### Step 2: Test JWT Authentication

```bash
# Stop current deployment
task down

# Start with JWT authentication
docker-compose -f docker-compose.yml -f docker-compose.cloud.yml up -d

# Verify services are running
docker-compose ps
```

### Step 3: Update Your Devices

For each device, update the NATS connection to use credentials:

**Before (Basic Auth)**:
```go
nc, err := nats.Connect("nats://home:changeme@localhost:4222")
```

**After (JWT Auth)**:
```go
nc, err := nats.Connect("nats://localhost:4222",
    nats.UserCredentials("./creds/device-light-001.creds"))
```

## Phase 2: Add Synadia Cloud Connection (Optional)

This phase connects your local NATS server to Synadia Cloud as a leaf node.

### Step 1: Configure Synadia Cloud

1. Log into https://app.ngs.global
2. Create a new account for your home
3. Download the account credentials
4. Save as `infrastructure/creds/synadia-cloud.creds`

### Step 2: Update NATS Configuration

Edit `infrastructure/nats-server-cloud.conf`:

```conf
# Uncomment the leaf node section
leafnodes {
  remotes = [
    {
      url: "tls://connect.ngs.global"
      credentials: "/creds/synadia-cloud.creds"
      account: "HOME"
    }
  ]
}
```

### Step 3: Restart NATS

```bash
docker-compose restart nats
```

Your local NATS is now connected to Synadia Cloud!

## Phase 3: Device Provisioning

Use the device provisioner to generate credentials for new devices.

### Step 1: Start Device Provisioner

```bash
# The provisioner is included in the cloud setup
docker-compose -f docker-compose.yml -f docker-compose.cloud.yml up -d device-provisioner
```

### Step 2: Provision a New Device

```bash
# Request new device credentials
nats request home.provisioning.request '{
  "device_id": "kitchen-light",
  "device_type": "light",
  "name": "Kitchen Light",
  "description": "Main kitchen ceiling light"
}'
```

This returns:
- JWT token for the device
- Seed for generating the private key
- Allowed publish/subscribe subjects

### Step 3: Use Credentials in Device

Save the returned credentials and use in your device:

```python
# Example for ESPHome/Python device
import nats

# Save the seed to a file
with open("device.seed", "w") as f:
    f.write(seed_from_response)

# Connect using the seed
nc = await nats.connect("nats://your-home.local:4222",
                       user_credentials="device.seed")
```

## Phase 4: Migrate Existing Devices

### Option 1: Gradual Migration

Keep both auth methods active during migration:

1. Leave basic auth enabled in NATS config
2. Provision JWT credentials for devices one by one
3. Update each device to use JWT
4. Once all migrated, disable basic auth

### Option 2: Maintenance Window

1. Schedule a maintenance window
2. Provision all device credentials at once
3. Update all devices to use JWT
4. Restart with JWT-only configuration

## Security Best Practices

### 1. Credential Storage

- **Never** commit credentials to git
- Store device seeds securely on each device
- Use environment variables for service credentials
- Rotate credentials periodically

### 2. Subject Permissions

Each device should only access its own subjects:

```json
{
  "publish": [
    "home.devices.light.kitchen-light.>",
    "home.discovery.announce"
  ],
  "subscribe": [
    "home.devices.light.kitchen-light.command"
  ]
}
```

### 3. Monitoring

Monitor failed authentication attempts:

```bash
# Watch NATS logs for auth failures
docker logs -f nats-home-automation | grep -i auth
```

## Rollback Plan

If issues arise during migration:

1. **Quick Rollback**:
   ```bash
   # Return to basic auth
   task down
   task up
   ```

2. **Partial Rollback**:
   - Re-enable basic auth in config
   - Devices can use either auth method
   - Fix issues before continuing

## Troubleshooting

### Connection Refused

**Symptom**: Services can't connect after enabling JWT
**Solution**: Verify credentials file path and permissions

```bash
# Check credential file exists
ls -la infrastructure/creds/

# Test connection
nats --creds infrastructure/creds/management-ui.creds pub test "hello"
```

### Invalid Credentials

**Symptom**: "authorization violation" errors
**Solution**: Regenerate credentials

```bash
cd infrastructure
nsc generate creds --account HOME --name device-name > creds/device-name.creds
```

### Leaf Node Not Connecting

**Symptom**: No cloud connectivity
**Solution**: Check Synadia Cloud credentials and network

```bash
# Test connection to Synadia Cloud
nats --server tls://connect.ngs.global --creds synadia-cloud.creds pub test "hello"
```

## Next Steps

After successful migration:

1. **Deploy Management UI to Cloud**: Move the web interface to cloud hosting
2. **Set Up Multi-Home Support**: Create accounts for additional homes
3. **Implement Credential Rotation**: Automate credential updates
4. **Add Monitoring**: Set up alerts for auth failures

## Support

- NATS Documentation: https://docs.nats.io
- Synadia Cloud: https://docs.synadia.com
- Project Issues: https://github.com/homix-dev/homix/issues