# NATS Home Automation Setup Guide

This guide walks you through setting up the NATS Home Automation system from scratch.

## Prerequisites

- Linux/macOS/Windows with Docker support
- NATS Server 2.10+ or Synadia Cloud account
- Home Assistant 2024.6+ (if using HA integration)
- ESPHome 2024.6+ (if using ESP devices)
- Basic networking knowledge

## Phase 1: NATS Infrastructure Setup

### Option A: Local NATS Server

1. **Using Docker**:
```bash
# Create a directory for NATS data
mkdir -p ~/nats-data

# Run NATS server with JetStream enabled
docker run -d \
  --name nats-server \
  -p 4222:4222 \
  -p 8222:8222 \
  -v ~/nats-data:/data \
  nats:latest \
  -js \
  -sd /data
```

2. **Using Native Binary**:
```bash
# Download NATS server
curl -L https://github.com/nats-io/nats-server/releases/latest/download/nats-server-linux-amd64.zip -o nats-server.zip
unzip nats-server.zip

# Create configuration file
cat > nats-server.conf <<EOF
port: 4222
http_port: 8222

jetstream {
  store_dir: "./nats-data"
  max_memory_store: 1GB
  max_file_store: 10GB
}

authorization {
  users: [
    {user: "admin", password: "changeme", permissions: {publish: ">", subscribe: ">"}}
    {user: "device", password: "devicepass", permissions: {
      publish: ["home.devices.>", "home.discovery.>"]
      subscribe: ["home.devices.>", "home.config.>"]
    }}
  ]
}
EOF

# Run NATS server
./nats-server -c nats-server.conf
```

### Option B: Synadia Cloud Setup

1. **Sign up for Synadia Cloud**:
   - Visit https://cloud.synadia.com
   - Create a free account
   - Create a new NATS cluster

2. **Download credentials**:
   - Generate user credentials
   - Download the `.creds` file
   - Save to `~/.nats/synadia.creds`

3. **Configure leaf node** (optional for edge deployment):
```bash
# Create leaf node configuration
cat > leaf-node.conf <<EOF
port: 4222

leaf_nodes {
  remotes: [
    {
      url: "nats-leaf://connect.ngs.global"
      credentials: "/home/user/.nats/synadia.creds"
    }
  ]
}

jetstream {
  store_dir: "./leaf-data"
  domain: "home"
}
EOF

# Run leaf node
nats-server -c leaf-node.conf
```

### Verify NATS Installation

```bash
# Install NATS CLI
curl -L https://github.com/nats-io/natscli/releases/latest/download/nats-linux-amd64.zip -o nats-cli.zip
unzip nats-cli.zip
sudo mv nats /usr/local/bin/

# Test connection
nats server check connection

# Enable JetStream
nats stream add DEVICES --subjects "home.devices.>" --storage file --retention limits --max-age 7d

# Test pub/sub
nats pub test.subject "Hello NATS"
nats sub test.subject
```

## Phase 2: Core Services Setup

### Discovery Service

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/nats-home-automation.git
cd nats-home-automation
```

2. **Build and run discovery service**:
```bash
cd services/discovery
go build -o discovery
./discovery --nats-url nats://localhost:4222
```

### Configuration Service

```bash
cd services/config
go build -o config-service
./config-service --nats-url nats://localhost:4222
```

## Phase 3: ESPHome Device Setup

### Install ESPHome

```bash
# Using pip
pip install esphome

# Or using Docker
docker pull esphome/esphome
```

### Create Device Configuration

1. **Basic ESP32 device**:
```yaml
# temperature-sensor.yaml
esphome:
  name: temp-sensor-01
  platform: ESP32
  board: esp32dev

wifi:
  ssid: "YourWiFi"
  password: "YourPassword"

# Enable logging
logger:

# Enable OTA updates
ota:
  password: "otapassword"

# NATS configuration
external_components:
  - source:
      type: local
      path: ../../esphome-components
    components: [ nats_client, nats_sensor ]

nats_client:
  id: nats
  server: "192.168.1.100"
  port: 4222
  username: "device"
  password: "devicepass"
  
# Sensors
sensor:
  - platform: dht22
    pin: GPIO4
    temperature:
      name: "Room Temperature"
      id: room_temp
    humidity:
      name: "Room Humidity"
      id: room_humidity
    update_interval: 30s

  - platform: nats_sensor
    name: "Room Temperature NATS"
    sensor_id: room_temp
    subject: "home.devices.sensor.temp01.state"
    qos: 1
```

2. **Compile and upload**:
```bash
esphome compile temperature-sensor.yaml
esphome upload temperature-sensor.yaml
```

## Phase 4: Home Assistant Integration

### Install NATS Bridge Integration

1. **Copy integration files**:
```bash
cp -r ha-integration/custom_components/nats_bridge ~/.homeassistant/custom_components/
```

2. **Add to configuration.yaml**:
```yaml
# configuration.yaml
nats_bridge:
  server: "localhost"
  port: 4222
  username: "admin"
  password: "changeme"
  discovery_prefix: "home.discovery"
  device_prefix: "home.devices"
```

3. **Restart Home Assistant**:
```bash
ha core restart
```

### Verify Integration

1. Check Home Assistant logs for NATS connection
2. Devices should appear automatically when they announce
3. Test device control from HA interface

## Phase 5: Protocol Bridges

### MQTT to NATS Bridge

```bash
cd bridges/mqtt
docker build -t mqtt-nats-bridge .
docker run -d \
  --name mqtt-bridge \
  -e NATS_URL=nats://localhost:4222 \
  -e MQTT_URL=tcp://localhost:1883 \
  mqtt-nats-bridge
```

### Zigbee2MQTT Integration

1. **Configure Zigbee2MQTT**:
```yaml
# zigbee2mqtt configuration.yaml
mqtt:
  base_topic: zigbee2mqtt
  server: 'mqtt://localhost:1883'
  
advanced:
  output: json
```

2. **The MQTT bridge will automatically translate Zigbee messages to NATS**

## Troubleshooting

### Connection Issues

1. **Check NATS server status**:
```bash
nats server info
```

2. **Monitor NATS traffic**:
```bash
nats sub "home.>"
```

3. **Check device logs**:
```bash
esphome logs temperature-sensor.yaml
```

### Common Problems

- **Devices not appearing**: Check discovery service is running
- **Commands not working**: Verify subject permissions
- **Connection drops**: Check network stability and firewall rules

## Next Steps

- Set up monitoring dashboard
- Configure automation rules
- Add more devices
- Enable cloud synchronization
- Set up backup procedures

## Security Recommendations

1. Change all default passwords
2. Use TLS for remote connections
3. Implement proper user permissions
4. Regular security updates
5. Monitor access logs