# Fix: Device Simulator Not Starting

The device simulator isn't starting with `task up` due to Docker registry authentication issues. Here are the solutions:

## Option 1: Run Device Simulator Locally (Recommended)

While other services run in containers, run the device simulator locally:

```bash
# After running task up, in a new terminal:
cd services/device-simulator
go run main.go
```

Access at: http://localhost:8083

## Option 2: Use Pre-built Image

We've already built the image locally. To use it:

1. First, ensure the image exists:
```bash
podman images | grep device-simulator
# or
docker images | grep device-simulator
```

2. The image should show: `nats-device-simulator:latest`

3. Run `task up` again - it should use the local image

## Option 3: Fix Docker/Podman Authentication

### For Docker Hub:
```bash
docker login
# Enter your Docker Hub credentials
```

### For Podman with Docker Hub:
```bash
podman login docker.io
# Enter your Docker Hub credentials
```

## Option 4: Use Alternative Registry

Edit `services/device-simulator/Dockerfile` to use a public registry:

```dockerfile
# Change FROM lines to use ghcr.io or quay.io
FROM ghcr.io/catthehacker/ubuntu:go-1.21 AS builder
# ... rest of Dockerfile
```

## Current Status

✅ Device Simulator image has been built locally as `nats-device-simulator:latest`
✅ Other services are running correctly
❌ Device Simulator container needs to be started

## Quick Fix

```bash
# Stop everything
task cleanup:cleanup:containers

# Start with the local image
DEVICE_SIMULATOR_IMAGE=nats-device-simulator:latest task up
```

## Verify It's Working

After starting, check:
1. http://localhost:8083 - Device Simulator UI
2. `podman ps` or `docker ps` - Should show nats-device-simulator container
3. `task status` - Should show all services as available