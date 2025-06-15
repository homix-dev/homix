# NATS Configuration Guide

This directory contains multiple NATS server configurations for different use cases.

## Configuration Files

### 1. `nats-server.conf` (Default)
- Main production configuration
- Includes local authentication (user: `home`, password: `changeme`)
- Connects to Synadia Cloud via leaf node
- Requires valid Synadia credentials file

### 2. `nats-server-dev.conf` (Development)
- Simplified configuration for local development
- No Synadia Cloud connection
- Local authentication only
- Best for testing without external dependencies

### 3. `nats-server-hybrid.conf` (Hybrid)
- Supports both local users and Synadia credentials
- More complex setup with operator mode
- Use when you need both authentication methods

## Quick Start

### Development Mode (Recommended for testing)
```bash
# Start NATS in development mode
task infra:start-dev

# Or manually with docker-compose
NATS_CONFIG=nats-server-dev.conf docker-compose up -d
```

### Production Mode (With Synadia Cloud)
```bash
# Ensure you have your credentials file
cp /path/to/your/nats-home-automation.creds infrastructure/

# Start NATS with Synadia connection
task infra:start
```

### Hybrid Mode
```bash
# Start with both local and Synadia auth
task infra:start-hybrid
```

## Connection Examples

### Local Development Connection
```bash
# Using nats CLI
nats --server=nats://localhost:4222 --user=home --password=changeme sub "home.>"

# Using environment variables
export NATS_URL=nats://localhost:4222
export NATS_USER=home
export NATS_PASSWORD=changeme
nats sub "home.>"
```

### Application Configuration
```yaml
# For Go applications
nats:
  url: nats://localhost:4222
  user: home
  password: changeme

# For Python applications
NATS_SERVERS=nats://localhost:4222
NATS_USER=home
NATS_PASSWORD=changeme
```

## Troubleshooting

### Connection Refused
```bash
# Check if NATS is running
docker ps | grep nats

# Check logs
docker logs nats-home-automation

# Test connection
nats --server=nats://localhost:4222 --user=home --password=changeme server check connection
```

### Authentication Failed
1. Verify you're using the correct configuration:
   ```bash
   docker exec nats-home-automation cat /proc/1/cmdline
   ```

2. Check which config is loaded in logs:
   ```bash
   docker logs nats-home-automation | grep "Server is ready"
   ```

3. For development, use:
   - User: `home`
   - Password: `changeme`

### Synadia Cloud Connection Issues
1. Verify credentials file exists:
   ```bash
   ls -la infrastructure/nats-home-automation.creds
   ```

2. Check leaf node status:
   ```bash
   curl http://localhost:8222/leafz
   ```

## Switching Configurations

### Using Task
```bash
# Development mode
task infra:stop
task infra:start-dev

# Production mode
task infra:stop
task infra:start

# Hybrid mode
task infra:stop
task infra:start-hybrid
```

### Using Docker Compose
```bash
# Stop current instance
docker-compose down

# Start with different config
NATS_CONFIG=nats-server-dev.conf docker-compose up -d
```

## Security Notes

1. **Change default passwords** before production use
2. **Protect credentials file** - never commit to git
3. **Use TLS** for production deployments
4. **Limit permissions** based on service needs

## JetStream Usage

All configurations have JetStream enabled:

```bash
# Create a stream
nats --server=nats://localhost:4222 --user=home --password=changeme \
  stream add HOME_EVENTS \
  --subjects="home.devices.>" \
  --storage=file \
  --retention=limits

# Create KV store
nats --server=nats://localhost:4222 --user=home --password=changeme \
  kv add devices
```