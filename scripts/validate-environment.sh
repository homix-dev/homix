#!/bin/bash
# Environment validation script for NATS Home Automation

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}NATS Home Automation - Environment Validation${NC}"
echo "=============================================="
echo ""

# Function to check command exists
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        return 1
    fi
}

# Function to check port
check_port() {
    local port=$1
    local service=$2
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠${NC}  Port $port ($service) is in use by:"
        lsof -i :$port | grep LISTEN | head -1 | awk '{print "    Process: " $1 " (PID: " $2 ")"}'
        return 1
    else
        echo -e "${GREEN}✓${NC} Port $port ($service) is available"
        return 0
    fi
}

# Function to check container runtime
check_container_runtime() {
    local runtime=""
    
    if command -v podman &> /dev/null; then
        runtime="podman"
    elif command -v docker &> /dev/null; then
        runtime="docker"
    fi
    
    if [ -n "$runtime" ]; then
        echo -e "${GREEN}✓${NC} Container runtime: $runtime"
        
        # Check if daemon is running
        if $runtime version &> /dev/null; then
            echo -e "${GREEN}✓${NC} $runtime daemon is running"
            
            # Check for existing containers
            local containers=$($runtime ps -a --format "{{.Names}}" | grep -E "nats-" || true)
            if [ -n "$containers" ]; then
                echo -e "${YELLOW}⚠${NC}  Found existing project containers:"
                echo "$containers" | sed 's/^/    /'
            fi
        else
            echo -e "${RED}✗${NC} $runtime daemon is not running"
            if [ "$runtime" = "docker" ]; then
                echo "    Start Docker Desktop or run: sudo systemctl start docker"
            else
                echo "    Start Podman machine with: podman machine start"
            fi
            return 1
        fi
    else
        echo -e "${RED}✗${NC} No container runtime found (Docker or Podman)"
        return 1
    fi
    
    export CONTAINER_TOOL=$runtime
    return 0
}

# Start validation
echo -e "${BLUE}1. Checking required tools:${NC}"
echo "-------------------------"
check_command "go" || echo "    Install from: https://golang.org/dl/"
check_command "task" || echo "    Install with: go install github.com/go-task/task/v3/cmd/task@latest"
check_command "nats" || echo "    Install with: go install github.com/nats-io/natscli/nats@latest"
check_command "git" || echo "    Install git for your OS"
check_command "curl" || echo "    Install curl for your OS"

echo ""
echo -e "${BLUE}2. Checking container runtime:${NC}"
echo "-----------------------------"
check_container_runtime

echo ""
echo -e "${BLUE}3. Checking required ports:${NC}"
echo "-------------------------"
all_ports_free=true
check_port 4222 "NATS Client" || all_ports_free=false
check_port 8222 "NATS HTTP" || all_ports_free=false
check_port 6222 "NATS Cluster" || all_ports_free=false
check_port 9222 "NATS WebSocket" || all_ports_free=false
check_port 8081 "Management UI" || all_ports_free=false
check_port 8082 "Health Monitor" || all_ports_free=false
check_port 8083 "Device Simulator" || all_ports_free=false

echo ""
echo -e "${BLUE}4. Checking Go environment:${NC}"
echo "-------------------------"
if command -v go &> /dev/null; then
    echo -e "${GREEN}✓${NC} Go version: $(go version | awk '{print $3}')"
    echo -e "${GREEN}✓${NC} GOPATH: ${GOPATH:-not set (using modules)}"
fi

echo ""
echo -e "${BLUE}5. Checking project structure:${NC}"
echo "----------------------------"
required_files=(
    "Taskfile.yaml"
    "docker-compose.yml"
    "infrastructure/nats-server-dev.conf"
    "services/device-simulator/main.go"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
    else
        echo -e "${RED}✗${NC} $file is missing"
    fi
done

echo ""
echo -e "${BLUE}Summary:${NC}"
echo "--------"

if [ "$all_ports_free" = true ] && [ -n "${CONTAINER_TOOL:-}" ]; then
    echo -e "${GREEN}✓ Environment is ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run: task up"
    echo "  2. Access services at:"
    echo "     • Management UI: http://localhost:8081"
    echo "     • Health Monitor: http://localhost:8082"
    echo "     • Device Simulator: http://localhost:8083"
else
    echo -e "${YELLOW}⚠ Some issues need to be resolved${NC}"
    echo ""
    echo "Suggested fixes:"
    if [ "$all_ports_free" = false ]; then
        echo "  • Free up ports: task cleanup:ports"
    fi
    if [ -z "${CONTAINER_TOOL:-}" ]; then
        echo "  • Install Docker or Podman"
    fi
    echo "  • Run: task fix"
fi