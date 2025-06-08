# Taskfile Usage Guide

This project uses [Task](https://taskfile.dev/) for build automation and development workflows.

## Installation

```bash
# macOS
brew install go-task

# Linux
sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d

# Windows
scoop install task
```

## Quick Start

```bash
# Show all available tasks
task --list

# Check dependencies
task check-deps

# Initial setup for development
task setup-dev

# Run everything in development mode
task dev

# Or start services manually
task start

# Run tests
task test

# Build everything
task build

# Clean all artifacts
task clean-all
```

## Common Tasks

### Infrastructure

```bash
# Start NATS server (development mode - no Synadia Cloud)
task infra:start-dev

# Start NATS server (production mode - with Synadia Cloud)
task infra:start

# Stop NATS server
task infra:stop

# View NATS logs
task infra:logs

# Test NATS connection
task infra:test-connection

# Create JetStream streams
task infra:create-streams

# Backup NATS data
task infra:backup
```

### Development

```bash
# Run discovery service with hot reload
task services:discovery:dev

# Run CLI tool
task tools:cli:run -- device list

# Run TUI interface
task tools:tui:run

# Monitor all NATS messages
task monitor

# Monitor device discoveries
task monitor-discovery
```

### Testing

```bash
# Run all tests
task test

# Run tests with coverage
task services:discovery:test
task services:discovery:coverage-report

# Run tests in watch mode
task services:discovery:test-watch

# Send test device announcement
task announce-test
```

### Building

```bash
# Build all components
task build

# Build specific service
task services:discovery:build

# Build CLI for all platforms
task tools:cli:build-all

# Build Docker images
task services:discovery:docker-build
```

### ESPHome Components

```bash
# Validate ESPHome configurations
task esphome:validate

# Compile test configuration
task esphome:compile

# Start ESPHome dashboard
task esphome:dev-server

# Upload to ESP device
task esphome:upload DEVICE=/dev/ttyUSB0

# Monitor ESP device logs
task esphome:logs DEVICE=/dev/ttyUSB0
```

### Code Quality

```bash
# Run all linters
task lint

# Format all code
task format

# Run Go linter only
task services:lint

# Format Python code
task esphome:format
```

### NATS Operations

```bash
# Open NATS CLI
task nats-cli

# List KV buckets
task kv-list

# List registered devices
task devices-list

# List device configurations
task config-list
```

## Task Variables

You can override default variables:

```bash
# Use different NATS server
task monitor NATS_SERVER=nats://192.168.1.100:4222

# Use podman instead of docker
task infra:start CONTAINER_TOOL=podman

# Specify device for CLI commands
task tools:cli:dev-device-info DEVICE_ID=esp32-kitchen
```

## Creating Custom Tasks

Add new tasks to any Taskfile.yaml:

```yaml
tasks:
  my-task:
    desc: Description of my task
    deps: [dependency-task]
    vars:
      MY_VAR: '{{default "default-value" .MY_VAR}}'
    cmds:
      - echo "Running {{.MY_VAR}}"
```

## Tips

1. **Parallel Execution**: Use `--parallel` flag to run independent tasks concurrently
   ```bash
   task --parallel test lint
   ```

2. **Dry Run**: Use `--dry` to see what commands would be executed
   ```bash
   task --dry build
   ```

3. **Force Run**: Use `--force` to run tasks even if they're up to date
   ```bash
   task --force build
   ```

4. **List Tasks**: Use `--list-all` to see all tasks including those without descriptions
   ```bash
   task --list-all
   ```

5. **Task Dependencies**: Tasks automatically run their dependencies first
   ```bash
   # This will run 'infra:start' first, then 'services:discovery:run'
   task start
   ```

## Troubleshooting

### Task not found
Make sure you're in the project root directory or specify the Taskfile location:
```bash
task -t /path/to/Taskfile.yaml <task-name>
```

### Permission denied
Some tasks may require elevated permissions:
```bash
sudo task infra:setup
```

### Variables not working
Ensure you're using the correct syntax:
```bash
# Correct
task build VERSION=1.0.0

# Incorrect
task build --VERSION=1.0.0
```