# NATS Infrastructure Setup

This directory contains the configuration and setup scripts for the NATS messaging infrastructure.

## Quick Start

### 1. Set up Synadia Cloud (10-15 minutes)

Follow the guide in `synadia-setup.md` to:
- Create a free Synadia Cloud account
- Create your first NATS cluster
- Download credentials file
- Save credentials as `nats-home-automation.creds` in this directory

### 2. Install Local NATS Server

The setup script supports both Docker and Podman.

**Prerequisites:**
- Docker + Docker Compose, OR
- Podman + podman-compose (`pip install podman-compose`)

Run the setup script:
```bash
cd infrastructure
./setup-local-nats.sh
```

This will:
- Detect Docker or Podman automatically
- Create necessary directories
- Start a local NATS server with JetStream enabled
- Configure leaf node connection to Synadia Cloud (if credentials exist)

### 3. Install NATS CLI

**macOS:**
```bash
brew install nats-io/nats-tools/nats
```

**Linux:**
```bash
curl -sf https://binaries.nats.dev/nats-io/natscli/nats@latest | sh
```

**Windows:**
Download from [NATS CLI Releases](https://github.com/nats-io/natscli/releases)

### 4. Test Your Setup

Test local server:
```bash
nats server info -s nats://home:changeme@localhost:4222
```

Test pub/sub:
```bash
# In terminal 1 - Subscribe
nats sub test.subject -s nats://home:changeme@localhost:4222

# In terminal 2 - Publish
nats pub test.subject "Hello NATS!" -s nats://home:changeme@localhost:4222
```

## Configuration Files

- `nats-server.conf` - Local NATS server configuration
- `docker-compose.yml` - Docker Compose setup
- `synadia-setup.md` - Synadia Cloud setup guide

## Default Credentials

⚠️ **Change these for production!**

- Account: `HOME`
- Username: `home`
- Password: `changeme`

Admin monitoring:
- Username: `admin`
- Password: `changeme`

## Useful Commands

View server logs:
```bash
docker-compose logs -f
```

Stop server:
```bash
docker-compose down
```

Restart server:
```bash
docker-compose restart
```

Check JetStream status:
```bash
nats stream ls -s nats://home:changeme@localhost:4222
```

## Next Steps

Once your infrastructure is set up:
1. Create subject schema documentation
2. Build device discovery service
3. Set up ESPHome NATS components

See the main ACTION_PLAN.md for detailed next steps.