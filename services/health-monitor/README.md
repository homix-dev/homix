# Device Health Monitor

A real-time health monitoring dashboard for the NATS Home Automation system. This service tracks all devices, their connectivity status, battery levels, and alerts.

## Features

- **Real-time Dashboard**: Web-based dashboard with live updates via WebSocket
- **Device Status Tracking**: Monitor online/offline status of all devices
- **Battery Monitoring**: Track battery levels and alert on low battery
- **Alert System**: Capture and display device alerts
- **Device Filtering**: Filter devices by type, status, or search
- **Visual Analytics**: Charts showing device distribution and system health
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- NATS server running
- Go 1.21 or later (for building from source)
- Web browser with JavaScript enabled

## Installation

### From Source

```bash
cd services/health-monitor
go build -o health-monitor
sudo cp health-monitor /usr/local/bin/
```

### Using Task

```bash
# From the project root
task services:health:build
task services:health:install
```

## Configuration

Create a `config.yaml` file:

```yaml
# NATS Configuration
nats:
  url: nats://localhost:4222
  credentials: ""  # Path to NATS credentials file

# HTTP Server Configuration
http:
  addr: :8080
  static: ./static

# Monitoring Configuration
monitor:
  device_timeout: 300s    # Device considered offline after 5 minutes
  update_interval: 30s    # Dashboard update interval

# Logging
debug: false
```

### Environment Variables

Configuration can also be set via environment variables (prefix with `HEALTH_MONITOR_`):

```bash
export HEALTH_MONITOR_NATS_URL=nats://nats.local:4222
export HEALTH_MONITOR_HTTP_ADDR=:8080
export HEALTH_MONITOR_DEBUG=true
```

## Usage

### Running the Monitor

```bash
# Using config file
health-monitor --config /path/to/config.yaml

# Using command line flags
health-monitor \
  --nats-url nats://localhost:4222 \
  --http-addr :8080 \
  --device-timeout 300 \
  --debug
```

### Accessing the Dashboard

Open your web browser and navigate to:

```
http://localhost:8080
```

### Systemd Service

Create `/etc/systemd/system/health-monitor.service`:

```ini
[Unit]
Description=NATS Home Automation Health Monitor
After=network.target nats.service

[Service]
Type=simple
User=nats-ha
ExecStart=/usr/local/bin/health-monitor --config /etc/health-monitor/config.yaml
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable health-monitor
sudo systemctl start health-monitor
```

## Dashboard Features

### Summary Cards

- **Total Devices**: Total number of discovered devices
- **Online**: Devices currently online
- **Offline**: Devices that haven't reported recently
- **Battery Warnings**: Devices with battery level below 20%

### Device Grid

Each device card shows:
- Device name and type
- Manufacturer and model
- Online/offline status
- Battery level (if applicable)
- Link quality
- Environmental data (temperature, humidity)
- Time since last update
- Alert count indicator

### Filtering Options

- **Type Filter**: Show only specific device types (sensors, switches, lights, etc.)
- **Status Filter**: Filter by online/offline status, low battery, or alerts
- **Search**: Search by device name, type, manufacturer, or model

### Device Details

Click on any device to see:
- Complete device information
- All current state values
- Alert history
- Update statistics
- First seen and last seen timestamps

### Visual Analytics

- **Device Type Distribution**: Pie chart showing device types
- **System Health**: Bar chart showing status distribution

## API Endpoints

### REST API

- `GET /api/devices` - Get all devices
- `GET /api/devices/{id}` - Get specific device
- `GET /api/summary` - Get system summary
- `GET /api/health` - Health check endpoint

### WebSocket

- `ws://localhost:8080/ws` - Real-time updates

## NATS Integration

The monitor subscribes to:
- `home.devices.*.*.state` - Device state updates
- `home.devices.*.*.announce` - Device announcements
- `home.*.alerts` - System alerts

## Alert Types

Alerts are automatically generated for:
- **Device Offline**: Device hasn't reported for configured timeout
- **Low Battery**: Battery level below 20%
- **High Power Usage**: Power consumption above threshold
- **Tamper Detection**: Security device tamper alerts
- **Water Leak**: Water leak sensor activation

## Performance

- Handles thousands of devices efficiently
- Updates dashboard every 30 seconds (configurable)
- WebSocket connection for real-time updates
- Minimal resource usage

## Troubleshooting

### Dashboard Not Loading

1. Check if service is running: `systemctl status health-monitor`
2. Verify HTTP port is accessible
3. Check browser console for errors
4. Ensure static files are in correct location

### Devices Not Appearing

1. Verify NATS connection
2. Check if devices are publishing to correct subjects
3. Enable debug logging to see message flow
4. Ensure device announcements are being sent

### WebSocket Connection Failed

1. Check if behind reverse proxy (may need WebSocket support)
2. Verify firewall allows WebSocket connections
3. Check browser supports WebSockets

### High Memory Usage

1. Check number of devices being monitored
2. Adjust update interval if needed
3. Clear old alerts periodically

## Development

### Building

```bash
go build -o health-monitor
```

### Running Tests

```bash
go test ./...
```

### Adding New Features

1. **New Metrics**: Add to `DeviceStatus` struct in `types.go`
2. **New Filters**: Update filter logic in `app.js`
3. **New Charts**: Add chart initialization and update logic
4. **New Alerts**: Add alert generation in `handleDeviceState()`

## Security Considerations

- Use NATS credentials for authentication
- Run service as non-root user
- Configure firewall to limit access
- Use HTTPS in production (reverse proxy)
- Sanitize device data before display

## License

Part of the NATS Home Automation project.