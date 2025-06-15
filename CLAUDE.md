# NATS Home Automation - Claude Assistant Guide

## Project Overview
This is a home automation system built on NATS messaging, providing a scalable, event-driven architecture for managing smart home devices and automations.

### Key Technologies
- **NATS**: Core messaging system with JetStream for persistence
- **Go**: Backend services (Discovery, Health Monitor, Management UI)
- **JavaScript**: Frontend visual automation designer
- **Docker/Podman**: Container orchestration
- **KV Store**: NATS KV buckets for state management

## Architecture

### Services
1. **NATS Server** (port 4222) - Core messaging backbone with JetStream enabled
   - WebSocket: port 9222
   - HTTP Monitor: port 8222
2. **Discovery Service** - Automatic device discovery and registration
3. **Health Monitor** (port 8082) - System health monitoring and dashboards
4. **Management UI** (port 8081) - Web interface with visual automation designer
5. **Device Simulator** (port 8083) - Web-based device simulation for testing
   - Uses dedicated 'simulator' user for NATS access

### NATS Subjects Structure
```
home.devices.{device_id}.state    # Device state updates
home.devices.{device_id}.command  # Device commands
home.devices.{device_id}.announce # Device announcements
home.devices.{device_id}.config   # Device configuration
home.devices.{device_id}.offline  # Device offline notifications
home.events.*                     # General events
home.events.system.service_started # Service startup notifications
home.events.system.service_stopped # Service shutdown notifications
home.automations.{id}.trigger     # Automation triggers
home.automations.{id}.status      # Automation status
home.services.{service}.status    # Service health status
home.discovery.announce           # Device discovery announcements
home.discovery.request            # Device discovery requests
```

### KV Buckets

#### With TTL (Expirable Caches)
- `devices`: Management UI device cache (TTL: 2 minutes)
- `device_registry`: Discovery service device cache (TTL: 5 minutes) 
- `automation-state`: Runtime state for automations (TTL: varies)

#### Persistent Storage (No TTL)
- `device-configs`: Device configuration templates
- `automations`: Automation definitions
- `scenes`: Scene definitions
- `dashboards`: Dashboard configurations
- `users`: User accounts and permissions

### Device Lifecycle Architecture

1. **Device Announcements**: Devices announce themselves every 30 seconds on `home.devices.{device_id}.announce`
2. **Service Caches**: Each service maintains its own expirable KV cache of devices
3. **Automatic Expiration**: Devices disappear from caches if they stop announcing (no manual cleanup needed)
4. **No Central Registry**: Each service has its own view based on what it needs

## Visual Automation Designer

### Component Categories

#### Triggers
- **Device State Changed**: Triggers when device state changes
- **NATS Event**: Listen for events on NATS subjects (supports wildcards)
- **Time**: Trigger at specific time
- **Schedule**: Cron-based scheduling
- **Sunrise/Sunset**: Solar-based triggers
- **Interval**: Regular interval triggers
- **State Changed**: Triggers when KV state changes

#### Actions
- **Control Device**: Send commands to devices
- **Publish NATS Event**: Publish events to subjects
- **Update State**: Update KV store values
- **Activate Scene**: Activate predefined scenes
- **Send Notification**: Send notifications
- **Delay**: Add delays between actions

#### Conditions
- **Device State Is**: Check device state
- **Time Between**: Check if current time is in range
- **Day of Week**: Check specific days
- **Numeric Compare**: Compare numeric values
- **Sun Position**: Check if sun is up/down

#### Logic
- **AND/OR/NOT Gates**: Boolean logic
- **Switch**: Route based on values
- **Counter**: Count events
- **Timer**: Time-based logic

#### State Management
- **Get/Set State**: Read/write KV values
- **Watch State**: Monitor changes
- **Compare State**: Compare with operators
- **Increment State**: Increment counters
- **Append to List**: Manage lists

## Development Workflow

### Running Services
```bash
# Using Podman (recommended)
export CONTAINER_TOOL=podman

# Start all services
task up

# View logs
task logs

# Stop services
task down

# Rebuild after changes
task build
task down && task up
```

### Key Files
- `/services/management-ui/static/js/simple-flow-designer.js` - Visual designer implementation
- `/services/management-ui/static/js/app.js` - Main UI application
- `/infrastructure/nats-server.conf` - NATS configuration
- `/docker-compose.yml` - Container orchestration

## Common Tasks

### Adding New Node Types
1. Add to `componentCategories` in `simple-flow-designer.js`
2. Add initialization in `initializeNodeData()`
3. Add edit form in `editNode()`
4. Add save logic in `saveNodeEdit()`
5. Add conversion logic in `convertToAutomation()`

### Testing Automations
```bash
# Monitor all NATS subjects
task monitor

# Test specific automation
nats pub automations.test.trigger '{}'

# Check KV state
nats kv get automation-state mykey
```

### Debugging
- Management UI logs: `podman logs nats-management-ui`
- Check NATS monitor: http://localhost:8222
- Health dashboard: http://localhost:8082

## Important Notes

### Keep the codebase clean
Make sure the codebase is clean and organized. When generating scripts to test 
things, either clean them up once testing is done, or give them a logical place 
to live. Same goes with markdown documents explaining what has changed etc.

### Container Management
- Always use `CONTAINER_TOOL=podman` environment variable
- Containers auto-restart on failure
- Init container sets up NATS streams/buckets

### Visual Designer
- Only visual designer is used (no form builder)
- Drag components from sidebar to canvas
- Double-click nodes to configure
- Connect nodes by dragging from output to input ports
- Right-click to delete nodes/connections

### State Management
- Default bucket: `automation-state`
- Supports TTL for temporary values
- Use {{variables}} for dynamic values in configurations

### NATS Event Patterns
- Single token wildcard: `events.*.created`
- Multi-token wildcard: `events.>`
- Queue groups for load balancing: set queue parameter

## Troubleshooting

### Canvas Rendering Issues
- Check CSS in `/services/management-ui/static/css/styles.css`
- Ensure no absolute positioning on canvas
- Verify container heights are set properly

### Automation Not Triggering
1. Check if automation is enabled
2. Verify NATS subjects match
3. Check device IDs are correct
4. Monitor subjects: `nats sub "devices.>"`

### State Not Persisting
- Ensure KV bucket exists: `nats kv ls`
- Check bucket name in node configuration
- Verify key format (no spaces)

## Recent Changes
- Removed form builder, visual designer only
- Added NATS event triggers and publishers
- Added comprehensive state management nodes
- Added device simulator for testing
- Improved validation flow with automatic cleanup
- Device simulator is now optional (use `task up:with-simulator` or run locally)

## Device Simulator

The device simulator is a web-based tool for testing automations without physical hardware.

### Features
- Simulate multiple device types (lights, switches, sensors, thermostats, locks, covers, etc.)
- Create multiple instances of each device type
- Real-time state updates via WebSocket
- Device state persistence in NATS KV store
- Import/export device configurations
- Interactive device controls

### Device Types Supported
1. **Light** - On/off, brightness control
2. **Switch** - Simple on/off control
3. **Sensor** - Temperature and humidity with automatic variations
4. **Thermostat** - Temperature control with modes
5. **Lock** - Lock/unlock states
6. **Cover** - Blinds/curtains with position control
7. **Motion Sensor** - Motion detection
8. **Door Sensor** - Contact open/closed
9. **Camera** - Recording state
10. **Fan** - Speed control

### Usage
1. Access at http://localhost:8083
2. Click "Add Device" to create new simulated devices
3. Use the sidebar filters to organize devices by type
4. Click "Control" on any device for detailed controls
5. Export/import configurations for test scenarios

### Integration with Automations
- Simulated devices publish to standard NATS subjects
- States are stored in KV bucket: `device-simulator`
- Devices respond to standard commands
- Perfect for testing automations before deployment