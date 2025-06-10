#!/bin/bash

# NATS Home Automation Management UI Startup Script

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting NATS Home Automation Management UI...${NC}"

# Check if NATS is running
if ! nc -z localhost 4222 2>/dev/null; then
    echo -e "${RED}Error: NATS server is not running on localhost:4222${NC}"
    echo -e "${YELLOW}Please start NATS server first with JetStream enabled${NC}"
    exit 1
fi

# Check if config exists
if [ ! -f "config.yaml" ]; then
    echo -e "${YELLOW}Creating default config.yaml...${NC}"
    cat > config.yaml << EOF
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
  
logging:
  level: "info"
EOF
fi

# Build if needed
if [ ! -f "./nats-home-management-ui" ]; then
    echo -e "${YELLOW}Building management UI...${NC}"
    go build -o nats-home-management-ui cmd/management-ui/main.go
    if [ $? -ne 0 ]; then
        echo -e "${RED}Build failed!${NC}"
        exit 1
    fi
fi

# Start the service
echo -e "${GREEN}Starting Management UI on http://localhost:8081${NC}"
./nats-home-management-ui -config config.yaml