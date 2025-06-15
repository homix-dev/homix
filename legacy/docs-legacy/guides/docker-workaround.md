# Docker/Podman Authentication Workaround

## Issue
You're experiencing Docker Hub authentication issues when trying to pull the golang base image.

## Solutions

### Option 1: Run Locally Without Containers (Recommended)
We've created a script that runs all services locally:

```bash
./run-local.sh
```

This will start:
- NATS Server
- Device Simulator (http://localhost:8083)
- Management UI (http://localhost:8081)
- Health Monitor (http://localhost:8082)
- Discovery Service

### Option 2: Use Alternative Registry
You can configure Podman to use a different registry:

```bash
# Use Quay.io mirror
podman pull quay.io/podman/stable:latest

# Or configure registry mirrors in /etc/containers/registries.conf
```

### Option 3: Build Images Locally
Since the device simulator is already running locally, you can skip the container build:

```bash
# Just run the services that don't require custom images
podman run -d --name nats -p 4222:4222 -p 8222:8222 nats:latest
```

### Option 4: Login to Docker Hub
If you have a Docker Hub account:

```bash
podman login docker.io
# Enter your username and password
```

## Current Status
✅ Device Simulator is running locally on port 8083
✅ NATS Server is running on port 4222

You can access the Device Simulator at: http://localhost:8083