# NATS Home Automation Management UI

A modern web-based management interface for the NATS Home Automation system.

## Features

- **Real-time Device Management**
  - View and control all connected devices
  - Real-time status updates via WebSocket
  - Device discovery functionality
  - Command sending and state monitoring

- **Automation Control**
  - Create, edit, and manage automations
  - Enable/disable automations
  - Test automation rules
  - View automation history

- **Scene Management**
  - Create and activate scenes
  - Group device actions
  - Quick scene activation

- **Dashboard**
  - System overview with key metrics
  - Recent device activity
  - Quick actions (All Lights Off, Away Mode, Night Mode)
  - Real-time event monitoring

- **System Management**
  - Configuration management
  - User authentication (framework in place)
  - System health monitoring
  - Event logging

## Architecture

The management UI is built with:
- **Backend**: Go with Gorilla Mux for routing
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Real-time**: WebSocket for live updates
- **Storage**: NATS JetStream KV stores for persistence
- **Styling**: Custom CSS with responsive design

## Configuration

The service is configured via YAML:

```yaml
http:
  addr: ":8081"
  static: "./static"

nats:
  url: "nats://localhost:4222"
  
api:
  prefix: "/api/v1"
  enable_cors: true
  
session:
  name: "nats-home-session"
  secret: "" # Auto-generated if not provided
  
logging:
  level: "info"
```

## API Endpoints

### Device Management
- `GET /api/v1/devices` - List all devices
- `GET /api/v1/devices/{id}` - Get device details
- `PUT /api/v1/devices/{id}` - Update device
- `DELETE /api/v1/devices/{id}` - Delete device
- `POST /api/v1/devices/{id}/command` - Send command to device
- `POST /api/v1/devices/discovery/start` - Start device discovery
- `GET /api/v1/devices/discovery/status` - Get discovery status

### Automation Management
- `GET /api/v1/automations` - List automations
- `POST /api/v1/automations` - Create automation
- `PUT /api/v1/automations/{id}` - Update automation
- `DELETE /api/v1/automations/{id}` - Delete automation
- `POST /api/v1/automations/{id}/enable` - Enable automation
- `POST /api/v1/automations/{id}/disable` - Disable automation
- `POST /api/v1/automations/{id}/test` - Test automation

### Scene Management
- `GET /api/v1/scenes` - List scenes
- `POST /api/v1/scenes` - Create scene
- `PUT /api/v1/scenes/{id}` - Update scene
- `DELETE /api/v1/scenes/{id}` - Delete scene
- `POST /api/v1/scenes/{id}/activate` - Activate scene

### System Management
- `GET /api/v1/system/info` - Get system information
- `GET /api/v1/system/health` - Health check
- `GET /api/v1/system/events` - Get system events

## WebSocket Protocol

The UI maintains a persistent WebSocket connection for real-time updates:

### Client Messages
```json
{
  "type": "subscribe",
  "topic": "devices"
}
```

### Server Messages
```json
{
  "type": "device_update",
  "data": {
    "device_id": "sensor_123",
    "state": {
      "temperature": 22.5,
      "humidity": 45
    }
  }
}
```

## Quick Actions

The dashboard provides quick actions for common scenarios:

- **All Lights Off**: Turns off all light devices
- **Away Mode**: Activates away mode (turns off lights/switches, activates away scene if available)
- **Night Mode**: Activates night mode (dims/turns off lights except bedrooms)

## Development

### Prerequisites
- Go 1.19+
- NATS Server with JetStream enabled

### Running Locally

```bash
# Install dependencies
go mod download

# Run the server
go run cmd/management-ui/main.go

# Or with custom config
go run cmd/management-ui/main.go -config config.yaml
```

The UI will be available at `http://localhost:8081`

### Building

```bash
# Build binary
go build -o management-ui cmd/management-ui/main.go

# Build Docker image
docker build -t nats-home-management-ui .
```

## Future Enhancements

- [ ] Visual automation builder
- [ ] Scene editor with device preview
- [ ] Historical data visualization
- [ ] Mobile app support
- [ ] Multi-user support with roles
- [ ] Plugin system for custom widgets
- [ ] Voice control integration