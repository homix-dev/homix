#!/bin/bash

# Discovery Service Test Script
# Tests all major functionality of the discovery service

set -e

# Configuration
NATS_URL="nats://home:changeme@localhost:4222"
SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

test_command() {
    local description="$1"
    local command="$2"
    local expected_pattern="$3"
    
    log_info "Testing: $description"
    
    output=$(eval "$command" 2>&1)
    if echo "$output" | grep -q "$expected_pattern"; then
        log_success "$description"
        return 0
    else
        log_error "$description"
        echo "Expected pattern: $expected_pattern"
        echo "Got: $output"
        return 1
    fi
}

# Start of tests
echo "=== Discovery Service Test Suite ==="
echo "NATS URL: $NATS_URL"
echo

# Check prerequisites
log_info "Checking prerequisites..."

# Check if NATS is running by trying to publish
if ! echo "test" | nats pub test.connection -s $NATS_URL >/dev/null 2>&1; then
    log_error "Cannot connect to NATS server at $NATS_URL"
    echo "Please start NATS server first:"
    echo "  cd infrastructure && ./setup-local-nats.sh"
    exit 1
fi
log_success "NATS server is running"

# Check if discovery service is built
if [ ! -f "$SERVICE_DIR/discovery" ]; then
    log_info "Building discovery service..."
    cd "$SERVICE_DIR"
    go build -o discovery .
    cd - >/dev/null
fi
log_success "Discovery service binary exists"

# Check if discovery service is already running
if nats request home.services.discovery.status '' -s $NATS_URL --timeout 1s >/dev/null 2>&1; then
    log_success "Discovery service is already running"
    DISCOVERY_PID=""
else
    # Start discovery service in background
    log_info "Starting discovery service..."
    cd "$SERVICE_DIR"
    ./discovery --debug > discovery.log 2>&1 &
    DISCOVERY_PID=$!
    cd - >/dev/null

    # Wait for service to start
    sleep 3

    # Check if service is running
    if ! kill -0 $DISCOVERY_PID 2>/dev/null; then
        log_error "Discovery service failed to start"
        cat "$SERVICE_DIR/discovery.log"
        exit 1
    fi
    log_success "Discovery service started (PID: $DISCOVERY_PID)"
fi

# Function to cleanup on exit
cleanup() {
    if [ -n "$DISCOVERY_PID" ]; then
        log_info "Cleaning up..."
        kill $DISCOVERY_PID 2>/dev/null || true
        wait $DISCOVERY_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT

echo
echo "=== Running Tests ==="
echo

# Test 1: Service health check
test_command \
    "Service health check" \
    "nats request home.services.discovery.status '' -s $NATS_URL --timeout 2s" \
    '"status":"healthy"'

# Test 2: Device announcement
log_info "Testing: Device announcement"
nats pub home.discovery.announce '{
    "device_id": "test-sensor-01",
    "device_type": "sensor",
    "name": "Test Temperature Sensor",
    "manufacturer": "Test Corp",
    "model": "TS-100",
    "capabilities": {
        "sensors": ["temperature", "humidity"],
        "units": {"temperature": "celsius", "humidity": "percent"}
    },
    "topics": {
        "state": "home.devices.sensor.test-sensor-01.state",
        "status": "home.devices.sensor.test-sensor-01.status"
    }
}' -s $NATS_URL
sleep 1
log_success "Device announcement"

# Test 3: List devices
test_command \
    "List devices after announcement" \
    "nats request home.discovery.request '' -s $NATS_URL --timeout 2s" \
    'test-sensor-01'

# Test 4: Get specific device
test_command \
    "Get specific device" \
    'nats request home.services.discovery.command '"'"'{"command":"get_device","params":{"device_id":"test-sensor-01"}}'"'"' -s '$NATS_URL' --timeout 2s' \
    '"device_id":"test-sensor-01"'

# Test 5: Set device configuration
log_info "Testing: Set device configuration"
output=$(nats request home.services.config.command '{
    "command": "set_device_config",
    "params": {
        "device_type": "sensor",
        "config": {
            "device_id": "test-sensor-01",
            "name": "Test Temperature Sensor",
            "location": "Test Lab",
            "enabled": true,
            "settings": {
                "update_interval": 60,
                "calibration_offset": 0.5
            }
        }
    }
}' -s $NATS_URL --timeout 2s 2>&1)

if echo "$output" | grep -q '"success":true'; then
    log_success "Set device configuration"
else
    log_error "Set device configuration"
    echo "$output"
fi

# Test 6: Get device configuration
test_command \
    "Get device configuration" \
    "nats request home.config.device.test-sensor-01 '' -s $NATS_URL --timeout 2s" \
    '"location":"Test Lab"'

# Test 7: Device status update
log_info "Testing: Device status update"
nats pub home.devices.sensor.test-sensor-01.status '{
    "online": true,
    "diagnostics": {
        "battery": 85,
        "rssi": -45,
        "uptime": 3600
    }
}' -s $NATS_URL
sleep 1
log_success "Device status update"

# Test 8: Create configuration backup
test_command \
    "Create configuration backup" \
    'nats request home.services.config.command '"'"'{"command":"create_backup","params":{"description":"Test backup"}}'"'"' -s '$NATS_URL' --timeout 2s' \
    '"backup-"'

# Test 9: List device configs
test_command \
    "List device configurations" \
    'nats request home.services.config.command '"'"'{"command":"list_device_configs"}'"'"' -s '$NATS_URL' --timeout 2s' \
    '"count":1'

# Test 10: Set system configuration
log_info "Testing: Set system configuration"
output=$(nats request home.services.config.command '{
    "command": "set_system_config",
    "params": {
        "config": {
            "component": "test",
            "settings": {
                "test_mode": true,
                "debug_level": 2
            }
        }
    }
}' -s $NATS_URL --timeout 2s 2>&1)

if echo "$output" | grep -q '"success":true'; then
    log_success "Set system configuration"
else
    log_error "Set system configuration"
    echo "$output"
fi

# Test 11: Announce second device
log_info "Testing: Second device announcement"
nats pub home.discovery.announce '{
    "device_id": "test-switch-01",
    "device_type": "switch",
    "name": "Test Switch",
    "capabilities": {
        "actuators": ["power"]
    },
    "topics": {
        "state": "home.devices.switch.test-switch-01.state",
        "command": "home.devices.switch.test-switch-01.command"
    }
}' -s $NATS_URL
sleep 1
log_success "Second device announcement"

# Test 12: List devices by type
test_command \
    "List devices by type" \
    'nats request home.discovery.request '"'"'{"device_type":"sensor"}'"'"' -s '$NATS_URL' --timeout 2s' \
    '"count":1'

# Test 13: Get service stats
test_command \
    "Get service statistics" \
    'nats request home.services.discovery.command '"'"'{"command":"get_stats"}'"'"' -s '$NATS_URL' --timeout 2s' \
    '"total_devices":2'

# Test 14: Delete device
log_info "Testing: Delete device"
output=$(nats request home.services.discovery.command '{
    "command": "delete_device",
    "params": {"device_id": "test-switch-01"}
}' -s $NATS_URL --timeout 2s 2>&1)

if echo "$output" | grep -q '"success":true'; then
    log_success "Delete device"
else
    log_error "Delete device"
    echo "$output"
fi

# Test 15: Verify deletion
test_command \
    "Verify device deletion" \
    'nats request home.services.discovery.command '"'"'{"command":"get_stats"}'"'"' -s '$NATS_URL' --timeout 2s' \
    '"total_devices":1'

echo
echo "=== Test Summary ==="
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $TESTS_FAILED"
echo

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    echo "Check discovery.log for details:"
    echo "tail -f $SERVICE_DIR/discovery.log"
    exit 1
fi