# Nova - Quick Start Guide

> Get your home automation system running in 5 minutes with Synadia Cloud!

## Prerequisites

- Docker or Podman installed
- Synadia Cloud account (free tier works great)

## Step 1: Set Up Synadia Cloud (2 minutes)

1. **Sign up** at [app.ngs.global](https://app.ngs.global)
2. **Create a context** called "home"
3. **Download credentials** → Save as `nova.creds`

## Step 2: Start Your Home Edge Server (1 minute)

```bash
# Download and run the edge server
docker run -d \
  --name nova-edge \
  --network host \
  -v ~/nova.creds:/creds/cloud.creds:ro \
  -e HOME_NAME="My Home" \
  ghcr.io/calmera/nova-edge:latest
```

That's it! Your home is now connected to the cloud.

## Step 3: Access the Management UI (30 seconds)

Open [nova.cloud](https://nova.cloud) and log in with your Synadia credentials.

You'll see your home appear automatically!

## Step 4: Add Your First Device (2 minutes)

### Option A: Simulated Device (for testing)
```bash
# Run a simulated light bulb
docker run -d \
  --name test-light \
  --network host \
  -e DEVICE_ID=light-001 \
  -e DEVICE_NAME="Test Light" \
  ghcr.io/calmera/nova-device-simulator:latest
```

### Option B: Real ESP32 Device
```bash
# Download device firmware
curl -L https://get.nova.sh/esp32 -o device.bin

# Flash to your ESP32
esptool.py write_flash 0x0 device.bin

# The device will show a QR code on first boot
# Scan it with your phone to provision
```

## What's Next?

### Create Your First Automation

1. In the UI, go to **Automations** → **Create**
2. Drag a **Time Trigger** (e.g., "At sunset")
3. Connect it to **Device Action** (e.g., "Turn on light")
4. Click **Save**

The automation runs locally on your edge server - no cloud dependency!

### Add More Devices

- **ESPHome devices**: Use our [ESPHome component](docs/devices/esphome.md)
- **Zigbee devices**: Enable the [Zigbee bridge](docs/devices/zigbee.md)
- **MQTT devices**: Enable the [MQTT bridge](docs/devices/mqtt.md)

### Explore Advanced Features

- **Multi-home support**: Add vacation home, office, etc.
- **User management**: Invite family members
- **Voice control**: Alexa/Google integration
- **Energy monitoring**: Track device usage

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐
│  Synadia Cloud  │         │   Your Home      │
│                 │         │                  │
│  • Web UI       │◄────────┤  • Edge Server   │
│  • User Auth    │  Leaf   │  • Automations   │
│  • Device Registry  Node  │  • Device Gateway│
│  • Automation Store       │  • Local Cache   │
└─────────────────┘         └──────────────────┘
                                      │
                              ┌───────┴────────┐
                              │ Local Devices  │
                              │ ESP32, Zigbee, │
                              │ Z-Wave, etc.   │
                              └────────────────┘
```

## Troubleshooting

### Edge server won't connect
```bash
# Check logs
docker logs nova-edge

# Test credentials
nats --server tls://connect.ngs.global --creds ~/nova.creds pub home.test.connection "test-$(date +%s)"
```

### Devices not appearing
```bash
# Check device discovery
docker exec nova-edge nova devices list

# Monitor device announcements
docker exec nova-edge nats sub "home.devices.*.announce"
```

### Need help?
- 📚 [Full Documentation](https://docs.nova.sh)
- 💬 [Discord Community](https://discord.gg/nova)
- 🐛 [Report Issues](https://github.com/calmera/nova/issues)

---

**Why Nova?**
- 🔒 **Secure**: Per-device credentials, no shared passwords
- 🏠 **Local First**: Automations run at home, work offline
- ☁️ **Cloud Managed**: Configure from anywhere
- 🚀 **Fast**: Sub-millisecond message delivery
- 🔧 **Open Source**: No vendor lock-in