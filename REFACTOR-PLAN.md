# Cloud-First Refactoring Plan

## Vision
Transform Homix into a cloud-first system where:
- **Management happens in Synadia Cloud** (UI, configuration, monitoring)
- **Execution happens at home** (automations, device control via leaf nodes)
- **Security is paramount** (per-device JWT credentials, no shared secrets)
- **Getting started is simple** (minimal local setup, cloud handles complexity)

## Current State Problems
1. **Local-first design** - Everything runs locally, cloud is an afterthought
2. **Basic auth everywhere** - Shared passwords (home:changeme)
3. **Complex setup** - Multiple docker containers, manual configuration
4. **Mixed concerns** - UI, discovery, monitoring all run locally
5. **No clear separation** - Cloud vs edge responsibilities unclear

## Target Architecture

### Cloud Components (Run in Synadia Cloud)
- **Management UI** - Web interface for configuration
- **Device Registry** - Central device database
- **Automation Designer** - Visual automation builder
- **User Management** - Multi-user support
- **Monitoring Dashboard** - System health overview

### Edge Components (Run at Home)
- **NATS Leaf Node** - Connects to cloud, runs automations
- **Device Gateway** - Translates device protocols to NATS
- **Automation Engine** - Executes automations locally
- **Local Cache** - Offline operation support

## Refactoring Steps

### Phase 1: Simplify Local Setup
1. **Single edge container** combining:
   - NATS server (configured as leaf node)
   - Automation engine
   - Device gateway
   
2. **Minimal configuration**:
   ```yaml
   # edge-config.yaml
   cloud:
     url: tls://connect.ngs.global
     creds: /path/to/NGS-Home-daan.creds
   home:
     id: my-home-1
     name: "Main House"
   ```

3. **One-line setup**:
   ```bash
   curl -sSL https://get.nova.sh | sh
   ```

### Phase 2: Move UI to Cloud
1. **Deploy Management UI as web app**
2. **Use Synadia Cloud KV** for configuration storage
3. **WebSocket connection** via NATS for real-time updates
4. **Remove local UI containers**

### Phase 3: Implement Per-Device Security
1. **Device provisioning service** in cloud
2. **QR code/PIN** for device onboarding
3. **Automatic credential rotation**
4. **Device certificates** stored in cloud KV

### Phase 4: Simplify Device Integration
1. **Protocol adapters** as plugins:
   - MQTT → NATS
   - Zigbee → NATS
   - Z-Wave → NATS
   
2. **Auto-discovery** with zero config
3. **Cloud-managed** device drivers

## New Repository Structure

```
nova/
├── edge/                      # Everything that runs at home
│   ├── Dockerfile            # Single container image
│   ├── config.yaml           # Simple configuration
│   ├── cmd/
│   │   └── edge/            # Main edge server
│   └── internal/
│       ├── automation/      # Local automation engine
│       ├── gateway/         # Device protocol gateway
│       └── leafnode/        # NATS leaf node manager
│
├── cloud/                     # Cloud-deployed components
│   ├── web-ui/              # Management interface
│   ├── api/                 # Cloud API
│   └── provisioner/         # Device provisioning
│
├── devices/                   # Device integrations
│   ├── esphome/             # ESPHome components
│   ├── tasmota/             # Tasmota integration
│   └── examples/            # Example devices
│
├── scripts/                   # Setup and utilities
│   ├── install.sh           # One-line installer
│   ├── provision-device.sh  # Device provisioning
│   └── migrate.sh           # Migration helper
│
└── docs/
    ├── quickstart.md        # 5-minute setup
    ├── architecture.md      # Cloud-first design
    └── devices/             # Device guides
```

## Configuration Examples

### Edge Configuration (edge/config.yaml)
```yaml
# Minimal configuration for edge node
cloud:
  connection:
    url: $SYNADIA_URL
    credentials: $SYNADIA_CREDS
  
home:
  id: $HOME_ID
  name: $HOME_NAME
  location:
    latitude: $LAT
    longitude: $LON
    timezone: $TZ

# Everything else configured via cloud
```

### Docker Compose (Simplified)
```yaml
version: '3.8'
services:
  edge:
    image: ghcr.io/calmera/nats-home-edge:latest
    container_name: nats-home-edge
    volumes:
      - ./config.yaml:/config.yaml:ro
      - ${SYNADIA_CREDS}:/creds/cloud.creds:ro
    environment:
      - HOME_ID=${HOME_ID}
    restart: unless-stopped
    network_mode: host  # For device discovery
```

## Developer Experience

### Getting Started (New User)
```bash
# 1. Sign up for Synadia Cloud
# 2. Create a "home" in the web UI
# 3. Download edge installer
curl -sSL https://get.nats-home.io | sh

# 4. Run setup
nats-home setup --creds ~/Downloads/NGS-Home-user.creds

# 5. Done! Access UI at https://home.nats.cloud
```

### Adding a Device
```bash
# Generate device credentials
nats-home device add --name "Living Room Light" --type light

# Flash to ESP32
nats-home device flash --port /dev/ttyUSB0
```

### Creating Automation (via UI)
1. Open https://home.nats.cloud
2. Click "Automations" → "Create"
3. Drag and drop triggers/actions
4. Save - automatically syncs to edge

## Benefits of This Approach

1. **Simplicity**: One container at home, UI in cloud
2. **Security**: Per-device JWTs, no shared secrets
3. **Reliability**: Local execution, cloud management
4. **Scalability**: Add homes/users easily
5. **Maintenance**: Update cloud without touching homes

## Migration Strategy

1. **Keep current version** as "v1-local"
2. **Build v2** with cloud-first design
3. **Provide migration tool** for existing users
4. **Sunset v1** after 6 months

## Next Steps

1. [ ] Get buy-in on this vision
2. [ ] Create edge prototype
3. [ ] Deploy UI to Vercel/Netlify
4. [ ] Build device provisioning
5. [ ] Create installer script
6. [ ] Update documentation
7. [ ] Marketing website

This refactor positions NATS Home Automation as the most secure, reliable, and easy-to-use open source home automation platform.