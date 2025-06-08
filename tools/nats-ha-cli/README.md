# NATS Home Automation CLI & TUI

A command-line interface and terminal user interface for managing your NATS-based home automation system.

## Features

- **CLI Mode**: Traditional command-line interface for scripting and automation
- **TUI Mode**: Interactive terminal UI built with Bubble Tea for easy management
- Device management (list, view, delete, announce)
- Configuration management (get, set, backup, restore)
- Real-time device status monitoring
- Easy-to-use interface for non-technical users

## Installation

```bash
cd tools/nats-ha-cli
go build -o nats-ha
```

Or install directly:
```bash
go install github.com/calmera/nats-home-automation/tools/nats-ha-cli@latest
```

## Usage

### CLI Mode

#### Global Options
```bash
nats-ha --server nats://localhost:4222 --user home --password changeme <command>
```

#### Device Commands

List all devices:
```bash
nats-ha device list
nats-ha device list --type sensor --online
nats-ha device list --output json
```

Get device details:
```bash
nats-ha device get temp-sensor-01
nats-ha device get temp-sensor-01 --output json
```

Delete a device:
```bash
nats-ha device delete old-sensor-01
nats-ha device delete old-sensor-01 --force  # Skip confirmation
```

Announce a new device:
```bash
nats-ha device announce --id esp32-01 --type sensor --name "Living Room Temp"
```

#### Configuration Commands

Get device configuration:
```bash
nats-ha config get temp-sensor-01
nats-ha config get temp-sensor-01 --output json
```

Set device configuration:
```bash
nats-ha config set temp-sensor-01 --name "Kitchen Sensor" --location "Kitchen"
nats-ha config set temp-sensor-01 --set update_interval=30 --set calibration_offset=0.5
nats-ha config set temp-sensor-01 --enabled=false  # Disable device
```

List all configurations:
```bash
nats-ha config list
nats-ha config list --output json
```

Backup configurations:
```bash
nats-ha config backup --description "Before update"
nats-ha config backup --file backup-2024-01-07.json
```

Restore from backup:
```bash
nats-ha config restore backup-1234567890
nats-ha config restore backup-2024-01-07.json --force
```

### TUI Mode

Launch the interactive terminal UI:
```bash
nats-ha tui
```

Or with connection options:
```bash
nats-ha tui --server nats://localhost:4222 --user home --password changeme
```

#### TUI Navigation

- **↑/↓**: Navigate through lists
- **Enter**: Select item or confirm
- **Tab**: Switch between form fields
- **Esc**: Go back
- **q**: Return to main menu (or quit from main menu)
- **r**: Refresh current view
- **Ctrl+C**: Quit application

#### TUI Features

1. **Main Menu**
   - Devices: View and manage all devices
   - Configurations: Manage device configurations

2. **Device View**
   - See all devices with online/offline status
   - View detailed device information
   - Real-time status updates

3. **Configuration View**
   - Edit device configurations
   - Enable/disable devices
   - Update settings interactively

## Configuration File

You can store default settings in `~/.nats-ha.yaml`:

```yaml
nats:
  url: nats://localhost:4222
  user: home
  password: changeme
```

Environment variables are also supported:
```bash
export NATS_HA_NATS_URL=nats://localhost:4222
export NATS_HA_NATS_USER=home
export NATS_HA_NATS_PASSWORD=changeme
```

## Examples

### Scripting Example

Monitor device status changes:
```bash
#!/bin/bash
while true; do
  nats-ha device list --online --output json | jq '.[] | select(.status.online == false)'
  sleep 30
done
```

### Batch Configuration Update

```bash
# Disable all offline devices
for device in $(nats-ha device list --output json | jq -r '.[] | select(.status.online == false) | .device_id'); do
  nats-ha config set $device --enabled=false
done
```

### Quick Device Check

```bash
# Check if a specific device is online
nats-ha device get living-room-sensor --output json | jq -r '.status.online'
```

## Advanced Usage

### Custom Output Formatting

Use `jq` for custom output:
```bash
nats-ha device list --output json | jq -r '.[] | [.device_id, .name, .status.online] | @csv'
```

### Integration with Other Tools

Export device list to CSV:
```bash
nats-ha device list --output json | jq -r '
  ["ID","Name","Type","Status","Last Seen"], 
  (.[] | [.device_id, .name, .device_type, 
    (if .status.online then "online" else "offline" end), 
    .status.last_seen]) | @csv
' > devices.csv
```

## Troubleshooting

### Connection Issues

If you can't connect:
1. Check NATS server is running: `nats server info`
2. Verify credentials are correct
3. Check firewall settings for port 4222

### TUI Display Issues

If the TUI doesn't display correctly:
1. Ensure terminal supports UTF-8
2. Try a different terminal emulator
3. Check terminal size (minimum 80x24 recommended)

## Development

### Building from Source

Using Task (recommended):
```bash
git clone https://github.com/calmera/nats-home-automation
cd nats-home-automation
task tools:cli:build
```

Or manually:
```bash
cd tools/nats-ha-cli
go mod download
go build -o bin/nats-ha
```

### Installing

Install to /usr/local/bin:
```bash
task tools:cli:install
```

### Running Tests

```bash
task tools:cli:test
```

### Running the Demo

```bash
task tools:cli:demo
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Same as the main NATS Home Automation project.