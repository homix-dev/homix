# NATS Home Automation - Validation & Troubleshooting Guide

## Overview

This guide helps you resolve common issues when running `task up` and ensures a smooth development experience.

## Quick Fixes

### 🚀 Most Common Solution
```bash
# Fix everything and start fresh
task fix
task up
```

### 🔍 Check What's Wrong
```bash
# Validate your environment
task validate

# Check current status
task status
```

### 🧹 Clean Up Everything
```bash
# Stop all services and clean up
task down

# Complete reset (removes all data)
task reset
```

## Common Issues and Solutions

### 1. "Port already in use" Error

**Symptom:** Error message about ports 4222, 8081, 8082, or 8083 being in use.

**Solution:**
```bash
# See what's using the ports
task cleanup:check-ports

# Free up the ports
task cleanup:ports

# Or do a complete cleanup
task fix
```

### 2. Container Runtime Issues

**Symptom:** "docker: command not found" or "Cannot connect to Docker daemon"

**Solution:**
```bash
# Check which runtime is available
./scripts/detect-container-tool.sh

# Use the detected tool
CONTAINER_TOOL=podman task up

# Or if you have Docker but it's not running
# macOS: Start Docker Desktop
# Linux: sudo systemctl start docker
```

### 3. Lingering NATS Processes

**Symptom:** NATS server already running, preventing containers from starting.

**Solution:**
```bash
# Kill all NATS processes
task cleanup:processes

# Or use the fix command
task fix
```

### 4. Container Name Conflicts

**Symptom:** "Container name already in use"

**Solution:**
```bash
# Remove specific containers
task cleanup:containers

# Or do a full cleanup
task down
```

### 5. Permission Issues

**Symptom:** Permission denied errors with volumes or files.

**Solution:**
```bash
# Fix permissions
task cleanup:fix-permissions

# Or run with sudo (not recommended)
sudo task up
```

## Validation Workflow

The improved `task up` command now:

1. **Validates** your environment
   - Checks container runtime (prefers Podman)
   - Verifies required ports are free
   - Detects existing containers

2. **Cleans up** automatically
   - Stops conflicting containers
   - Removes old project containers
   - Ensures clean state

3. **Starts services** with health checks
   - Waits for NATS to be healthy
   - Shows real-time status
   - Reports any failures

## Available Commands

### Core Commands
- `task up` - Start all services (with validation)
- `task down` - Stop all services and clean up
- `task status` - Check current status

### Troubleshooting Commands
- `task validate` - Check if environment is ready
- `task fix` - Fix common issues automatically
- `task reset` - Complete reset (deletes all data)

### Cleanup Commands
- `task cleanup:validate` - Just validate, don't fix
- `task cleanup:processes` - Stop all processes
- `task cleanup:containers` - Remove containers
- `task cleanup:ports` - Free up ports
- `task cleanup:volumes` - Remove data volumes
- `task cleanup:networks` - Clean up networks

## Environment Variables

### Container Runtime
```bash
# Use Docker explicitly
CONTAINER_TOOL=docker task up

# Use Podman explicitly
CONTAINER_TOOL=podman task up
```

### Custom Ports
If default ports conflict with your system:
```bash
# Edit .env file
cp .env.example .env
# Then modify the ports in .env
```

## Debugging

### Check Logs
```bash
# View all logs
task logs

# View specific service logs
podman logs nats-home-automation
podman logs nats-device-simulator
```

### Manual Validation
```bash
# Run the validation script
./scripts/validate-environment.sh

# Check container status
podman ps -a

# Check port usage
lsof -i :4222
```

## Best Practices

1. **Always use `task up`** instead of direct docker/podman commands
2. **Run `task validate`** if you encounter issues
3. **Use `task fix`** for quick cleanup
4. **Check `task status`** to see what's running
5. **Run `task down`** when done to free resources

## Still Having Issues?

1. Check the logs: `task logs`
2. Run manual validation: `./scripts/validate-environment.sh`
3. Try a complete reset: `task reset`
4. Check for updates: `git pull`
5. Report issues: https://github.com/calmera/nats-home-automation/issues