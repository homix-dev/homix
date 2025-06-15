# Infrastructure Management

In the cloud-first architecture, infrastructure is built into the edge server. This directory contains setup scripts and cloud configuration.

## Quick Start

### Test Your Synadia Cloud Connection
```bash
# Test connection to Synadia Cloud
task test-cloud-connection

# Or use the script directly
./scripts/test-cloud-connection.sh ~/.synadia/NGS-Home-daan.creds
```

### Set Up Synadia Cloud (First Time)
```bash
# Interactive setup script
./infrastructure/setup-synadia-cloud.sh
```

## Cloud-First Architecture

With Synadia Cloud:
- **No local NATS server needed** - Edge server connects as leaf node
- **No JetStream setup** - Managed by Synadia Cloud  
- **No user management** - JWT authentication via Synadia
- **No monitoring setup** - Use Synadia Cloud dashboard

## Edge Server Deployment

The edge server includes all infrastructure:

```bash
# Using Docker
docker run -d \
  --name nova-edge \
  --network host \
  -v ~/.synadia/NGS-Home-daan.creds:/creds/cloud.creds:ro \
  -e HOME_NAME="My Home" \
  ghcr.io/calmera/nova-edge:latest

# Using Task
task edge:start
```

## Available Scripts

### `setup-synadia-cloud.sh`
Interactive script to set up JWT credentials for devices and services.

### `test-cloud-connection.sh`  
Validates your Synadia Cloud credentials and connection.

### Legacy Scripts (moved to legacy/)
- `init-nats.sh` - Local JetStream initialization (legacy)
- `nats-healthcheck.sh` - Local health monitoring (legacy)

## Monitoring

### Edge Server Status
```bash
# Check edge server health
curl http://localhost:8222/healthz

# View leaf node connection
curl http://localhost:8222/leafz
```

### Synadia Cloud Dashboard
- Visit [app.ngs.global](https://app.ngs.global)
- Monitor connections, subjects, and usage
- Manage users and permissions

### Message Monitoring
```bash
# Monitor all home automation messages
nats --server tls://connect.ngs.global --creds ~/.synadia/NGS-Home-daan.creds sub "home.>"

# Monitor specific device
nats --server tls://connect.ngs.global --creds ~/.synadia/NGS-Home-daan.creds sub "home.devices.light-001.>"
```

## Troubleshooting

### Connection Issues
1. **Test credentials**: `task test-cloud-connection`
2. **Check internet**: Ensure outbound TLS (port 443) is allowed
3. **Verify credentials**: Check file exists and is readable

### Edge Server Issues
1. **Check logs**: `docker logs nova-edge`
2. **Verify ports**: Port 4222 must be available for local devices
3. **Test local connection**: `nats --server nats://localhost:4222 pub test.msg hello`

### Device Connection Issues
1. **Check device on same network**: Devices connect to local edge server (port 4222)
2. **Monitor announcements**: `nats sub "home.devices.*.announce"`
3. **Verify device credentials**: Each device needs valid JWT credentials

## Legacy Infrastructure

For the old multi-container setup, see `legacy/infrastructure/` directory.

## Next Steps

1. **Add devices**: See [device documentation](../docs/devices/)
2. **Create automations**: Use [cloud UI](https://home.nats.cloud)
3. **Monitor system**: Check [Synadia dashboard](https://app.ngs.global)