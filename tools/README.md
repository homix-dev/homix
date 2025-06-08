# NATS Home Automation Tools

This directory contains tools and utilities for managing and interacting with the NATS home automation system.

## Available Tools

### 1. nats-ha-cli

A comprehensive command-line interface and terminal UI for managing your home automation system.

**Features:**
- Device management (list, view, delete, announce)
- Configuration management (get, set, backup, restore)
- Real-time monitoring (states, events, discovery)
- Interactive Terminal UI with Bubble Tea
- JSON output for scripting
- Watch mode for live updates

**Installation:**
```bash
cd nats-ha-cli
go build -o nats-ha
# Or: go install
```

**Quick Examples:**
```bash
# List all devices
nats-ha device list --server nats://localhost:4222 --user home --password changeme

# Get device details
nats-ha device get sensor-01

# Edit configuration
nats-ha config set sensor-01 --name "Living Room" --location "Living Room"

# Watch real-time state changes
nats-ha watch states

# Launch interactive TUI
nats-ha tui
```

See [nats-ha-cli/README.md](nats-ha-cli/README.md) for full documentation.

## Future Tools

### Planned Development

1. **nats-ha-dashboard** - Web-based dashboard for system monitoring
2. **nats-ha-bridge** - Bridge tool for integrating with other protocols
3. **nats-ha-simulator** - Device simulator for testing
4. **nats-ha-backup** - Automated backup and restore utility
5. **nats-ha-monitor** - System health monitoring and alerting

## Contributing

To add a new tool:

1. Create a directory under `tools/`
2. Include a README.md with usage instructions
3. Follow Go module conventions if applicable
4. Add the tool to this README

## Development Guidelines

- Use consistent naming: `nats-ha-<toolname>`
- Provide both CLI and programmatic interfaces where appropriate
- Include comprehensive help text
- Support configuration via files, env vars, and flags
- Add examples and documentation

## Common Flags

All tools should support these common flags:
- `--server` - NATS server URL
- `--user` - NATS username
- `--password` - NATS password
- `--config` - Configuration file path
- `--help` - Show help information

## Testing Tools

Before deploying:
1. Test with local NATS server
2. Test with Synadia Cloud connection
3. Verify all error conditions
4. Document any prerequisites

## Support

For issues or questions:
- Check individual tool documentation
- Review example scripts
- Submit issues to the main project repository