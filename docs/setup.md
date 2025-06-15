# Setup Guide

This guide walks you through setting up NATS Home Automation with Synadia Cloud.

## Prerequisites

- Docker or Podman installed
- Internet connection for initial setup
- 5 minutes of your time

## Step 1: Create Synadia Cloud Account

1. Visit [app.ngs.global](https://app.ngs.global)
2. Sign up for a free account
3. Create a new context called "home"
4. Download your credentials file

## Step 2: Run the Installer

### Option A: Interactive Installer (Recommended)

```bash
curl -sSL https://get.nats-home.io | sh
```

The installer will:
- Check prerequisites
- Help configure your credentials
- Set up your home name and location
- Start the edge server
- Provide next steps

### Option B: Manual Setup

1. **Download credentials** from Synadia Cloud
2. **Create configuration**:
   ```bash
   mkdir -p ~/nats-home/data
   cd ~/nats-home
   ```

3. **Create docker-compose.yml**:
   ```yaml
   version: '3.8'
   services:
     edge:
       image: ghcr.io/calmera/nats-home-edge:latest
       container_name: nats-home-edge
       restart: unless-stopped
       network_mode: host
       volumes:
         - ~/.synadia/NGS-Home-user.creds:/creds/cloud.creds:ro
         - ./data:/data
       environment:
         - HOME_NAME=My Home
   ```

4. **Start the edge server**:
   ```bash
   docker compose up -d
   ```

## Step 3: Access the UI

1. Open [home.nats.cloud](https://home.nats.cloud)
2. Log in with your Synadia account
3. Your home should appear automatically

## Step 4: Add Your First Device

### Test Device (Simulator)
```bash
docker run -d \
  --name test-light \
  --network host \
  -e DEVICE_ID=light-001 \
  ghcr.io/calmera/nats-device-simulator:latest
```

### Real ESP32 Device
1. Flash the NATS firmware to your ESP32
2. On first boot, device shows QR code
3. Scan with your phone to provision
4. Device automatically connects

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HOME_NAME` | Display name for your home | My Home |
| `HOME_LAT` | Latitude for sunrise/sunset | - |
| `HOME_LON` | Longitude for sunrise/sunset | - |
| `HOME_TZ` | Timezone | America/New_York |
| `LOG_LEVEL` | Logging verbosity | info |

### Custom Configuration File

Create `config/edge.yaml`:
```yaml
cloud:
  url: tls://connect.ngs.global
  credentials: /creds/cloud.creds
  
home:
  name: "Beach House"
  location:
    latitude: 25.7617
    longitude: -80.1918
    timezone: America/Miami

gateway:
  bridges:
    mqtt:
      enabled: true
      port: 1883
    zigbee:
      enabled: true
      device: /dev/ttyUSB0
```

Mount in docker-compose.yml:
```yaml
volumes:
  - ./config/edge.yaml:/config/edge.yaml:ro
```

## Ports Used

| Port | Service | Description |
|------|---------|-------------|
| 4222 | NATS | Local device connections |
| 8222 | HTTP | NATS monitoring endpoint |
| 9222 | WebSocket | Real-time updates |
| 1883 | MQTT | MQTT bridge (optional) |
| 8080 | HTTP | REST API (optional) |
| 2112 | HTTP | Prometheus metrics |

## Troubleshooting

### Edge Server Won't Start

Check logs:
```bash
docker logs nats-home-edge
```

Common issues:
- Invalid credentials file
- Port 4222 already in use
- Network connectivity issues

### Can't See Home in UI

1. Verify edge server is running
2. Check cloud connection:
   ```bash
   docker exec nats-home-edge nats-home status
   ```
3. Ensure credentials are valid

### Devices Not Connecting

1. Check device is on same network
2. Verify port 4222 is accessible
3. Monitor device announcements:
   ```bash
   docker exec nats-home-edge \
     nats sub "home.devices.*.announce"
   ```

## Next Steps

- [Add more devices](devices/README.md)
- [Create your first automation](automations/README.md)
- [Set up energy monitoring](energy/README.md)
- [Configure multi-home setup](multi-home/README.md)

## Getting Help

- **Discord**: [Join our community](https://discord.gg/nats-home)
- **GitHub**: [Report issues](https://github.com/calmera/nats-home-automation/issues)
- **Docs**: [Full documentation](https://docs.nats-home.io)