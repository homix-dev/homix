#!/bin/bash

# NATS Local Server Setup Script

set -e

echo "=== NATS Home Automation Local Setup ==="
echo

# Check for container runtime (Podman first, then Docker)
CONTAINER_RUNTIME=""
COMPOSE_CMD=""

# Check for Podman first
if command -v podman &> /dev/null; then
    CONTAINER_RUNTIME="podman"
    # Check for podman-compose
    if command -v podman-compose &> /dev/null; then
        COMPOSE_CMD="podman-compose"
    fi
fi

# Check for Docker if Podman not found
if [ -z "$CONTAINER_RUNTIME" ] && command -v docker &> /dev/null; then
    CONTAINER_RUNTIME="docker"
    # Check for docker-compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    fi
fi

# Verify we have a container runtime
if [ -z "$CONTAINER_RUNTIME" ]; then
    echo "Error: Neither Docker nor Podman is installed."
    echo "Please install one of the following:"
    echo "  - Docker: https://docs.docker.com/get-docker/"
    echo "  - Podman: https://podman.io/getting-started/installation"
    exit 1
fi

# Verify we have a compose command
if [ -z "$COMPOSE_CMD" ]; then
    echo "Error: Compose tool not found."
    if [ "$CONTAINER_RUNTIME" = "docker" ]; then
        echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    else
        echo "Please install podman-compose: pip install podman-compose"
    fi
    exit 1
fi

echo "Using $CONTAINER_RUNTIME with $COMPOSE_CMD"

# Create data directory
echo "Creating data directory..."
mkdir -p nats-data

# Check for credentials file
if [ ! -f "nats-home-automation.creds" ]; then
    echo ""
    echo "WARNING: Synadia Cloud credentials file not found!"
    echo "Please:"
    echo "1. Complete the Synadia Cloud setup (see synadia-setup.md)"
    echo "2. Download your credentials file"
    echo "3. Save it as: infrastructure/nats-home-automation.creds"
    echo ""
    echo "The server will start without cloud connection."
    echo "You can add the credentials later and restart."
    echo ""
    read -p "Continue without cloud connection? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update docker-compose.yml to mount credentials if available
if [ -f "nats-home-automation.creds" ]; then
    echo "Found credentials file. Updating Docker configuration..."
    # Check if credentials mount already exists
    if ! grep -q "nats-home-automation.creds" docker-compose.yml; then
        # Create a temporary file with the updated configuration
        awk '/volumes:/ && !done {print; print "      - ./nats-home-automation.creds:/etc/nats/nats-home-automation.creds:ro"; done=1; next} 1' docker-compose.yml > docker-compose.yml.tmp
        mv docker-compose.yml.tmp docker-compose.yml
    fi
fi

# Start NATS server
echo "Starting NATS server..."
$COMPOSE_CMD up -d

# Wait for server to start
echo "Waiting for NATS server to start..."
sleep 5

# Check if server is running
if $CONTAINER_RUNTIME ps | grep -q nats-home-automation; then
    echo ""
    echo "✅ NATS server is running!"
    echo ""
    echo "Server endpoints:"
    echo "  - Client: nats://localhost:4222"
    echo "  - Monitoring: http://localhost:8222"
    echo ""
    echo "Default credentials:"
    echo "  - Account: HOME"
    echo "  - User: home"
    echo "  - Password: changeme"
    echo ""
    echo "⚠️  IMPORTANT: Change the default passwords in nats-server.conf for production use!"
    echo ""
    echo "To view logs: $COMPOSE_CMD logs -f"
    echo "To stop: $COMPOSE_CMD down"
else
    echo "❌ Failed to start NATS server. Check logs with:"
    echo "$COMPOSE_CMD logs"
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Install NATS CLI: brew install nats-io/nats-tools/nats (macOS) or see https://github.com/nats-io/natscli"
echo "2. Test connection: nats server info -s nats://home:changeme@localhost:4222"
echo "3. Configure leaf node connection to Synadia Cloud (if not done already)"