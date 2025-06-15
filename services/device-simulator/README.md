# Homix Device Simulator

A web-based device simulator for testing Homix home automation without physical hardware.

## Features

- 🎛️ **Multiple Device Types**: Lights, switches, sensors, thermostats, locks, covers, and more
- 🔄 **Real-time Updates**: WebSocket connection for instant state changes
- 💾 **State Persistence**: Device states saved in NATS KV store
- 📥 **Import/Export**: Save and load device configurations
- 🎨 **Interactive UI**: Modern web interface with device controls
- 🔗 **NATS Integration**: Fully compatible with the automation system

## Quick Start

### Using Task (Recommended)
```bash
# From project root
task services:simulator:run
```

### Manual Start
```bash
cd services/device-simulator
go run main.go
```

### Docker
```bash
# Build image
docker build -t homix-device-simulator .

# Run container
docker run -p 8083:8083 -e NATS_URL=nats://home:changeme@localhost:4222 homix-device-simulator
```

## Usage

1. Open http://localhost:8083 in your browser
2. Click "Add Device" to create new devices
3. Configure device properties (name, room, initial state)
4. Use the "Control" button for detailed device controls
5. Filter devices by type using the sidebar
6. Export configurations for test scenarios

## Device Types

### Light
- On/off state
- Brightness control (0-100%)
- Color control (future)

### Switch
- Simple on/off state

### Sensor
- Temperature readings
- Humidity readings
- Automatic value variations

### Thermostat
- Current/target temperature
- Operating modes (off, heat, cool, auto)
- Fan modes

### Lock
- Locked/unlocked states

### Cover (Blinds/Curtains)
- Position control (0-100%)
- Open/close/stop commands

### Motion Sensor
- Motion detection state

### Door Sensor
- Contact open/closed state

### Camera
- Recording state
- Motion detection

### Fan
- On/off state
- Speed control (low, medium, high)

## NATS Integration

### Published Subjects
- `devices.{device_id}.state` - Device state updates
- `devices.{device_id}.announce` - Device registration

### Subscribed Subjects
- `devices.{device_id}.command` - Device commands

### KV Bucket
- Bucket: `device-simulator`
- Keys: Device IDs
- Values: Device state JSON

## Configuration

Environment variables:
- `NATS_URL` - NATS server URL (default: nats://home:changeme@localhost:4222)
- `HTTP_PORT` - HTTP server port (default: 8083)

## Development

### Project Structure
```
device-simulator/
├── main.go              # Go backend server
├── static/
│   ├── index.html      # Main UI
│   ├── css/
│   │   └── styles.css  # Styling
│   └── js/
│       └── device-simulator.js  # Frontend logic
├── Dockerfile          # Container build
└── Taskfile.yaml      # Task automation
```

### Testing with Automations

1. Create simulated devices
2. Build automations in Management UI
3. Test triggers and actions
4. Export working configurations

### API Endpoints

- `GET /api/devices` - List all devices
- `POST /api/devices` - Create device
- `GET /api/devices/{id}` - Get device
- `PUT /api/devices/{id}` - Update device
- `DELETE /api/devices/{id}` - Delete device
- `PUT /api/devices/{id}/state` - Update device state
- `POST /api/devices/{id}/toggle` - Toggle device
- `GET /api/devices/export` - Export configuration
- `POST /api/devices/import` - Import configuration
- `GET /api/device-types` - List device types
- `WS /ws` - WebSocket connection

## Troubleshooting

### Devices not appearing
- Check NATS connection
- Verify KV bucket exists
- Check browser console for errors

### State not updating
- Ensure WebSocket is connected
- Check NATS subjects match
- Verify device ID format

### Import/Export issues
- Check JSON format
- Verify device IDs are unique
- Check file permissions