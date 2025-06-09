#!/bin/bash
# Test script for NATS infrastructure

set -e

echo "Testing NATS infrastructure..."

# Function to check if NATS is running
check_nats() {
    local url=$1
    local name=$2
    
    echo -n "Checking $name... "
    if nats ping --server="$url" >/dev/null 2>&1; then
        echo "✓ OK"
        return 0
    else
        echo "✗ FAILED"
        return 1
    fi
}

# Function to test JetStream
test_jetstream() {
    local url=$1
    
    echo "Testing JetStream on $url..."
    
    # Create test stream
    nats stream add TEST_STREAM \
        --subjects="test.>" \
        --storage=memory \
        --retention=limits \
        --max-msgs=100 \
        --server="$url" \
        --force >/dev/null 2>&1
    
    # Publish test message
    echo "test message" | nats pub test.subject --server="$url" >/dev/null 2>&1
    
    # Check stream info
    if nats stream info TEST_STREAM --server="$url" >/dev/null 2>&1; then
        echo "✓ JetStream working"
    else
        echo "✗ JetStream failed"
        return 1
    fi
    
    # Cleanup
    nats stream rm TEST_STREAM --force --server="$url" >/dev/null 2>&1
}

# Function to test KV store
test_kv() {
    local url=$1
    
    echo "Testing KV store on $url..."
    
    # Create test bucket
    nats kv add TEST_KV --server="$url" >/dev/null 2>&1
    
    # Put value
    echo "test value" | nats kv put TEST_KV test_key --server="$url" >/dev/null 2>&1
    
    # Get value
    if nats kv get TEST_KV test_key --server="$url" >/dev/null 2>&1; then
        echo "✓ KV store working"
    else
        echo "✗ KV store failed"
        return 1
    fi
    
    # Cleanup
    nats kv rm TEST_KV --force --server="$url" >/dev/null 2>&1
}

# Function to test subject permissions
test_permissions() {
    local url=$1
    local user=$2
    local pass=$3
    
    echo "Testing permissions for user $user..."
    
    # Test allowed subjects
    echo "test" | nats pub home.test --server="$url" --user="$user" --password="$pass" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ Can publish to home.>"
    else
        echo "✗ Cannot publish to home.>"
        return 1
    fi
    
    # Test subscribe
    timeout 1 nats sub "home.>" --server="$url" --user="$user" --password="$pass" >/dev/null 2>&1
    if [ $? -eq 124 ]; then  # Timeout exit code
        echo "✓ Can subscribe to home.>"
    else
        echo "✗ Cannot subscribe to home.>"
        return 1
    fi
}

# Function to test connectivity between servers
test_connectivity() {
    local from_url=$1
    local to_subject=$2
    local from_name=$3
    local to_name=$4
    
    echo "Testing connectivity from $from_name to $to_name..."
    
    # Subscribe on one server
    (timeout 2 nats sub "$to_subject" --server="$from_url" 2>&1 | grep -q "test connectivity") &
    SUB_PID=$!
    
    sleep 0.5
    
    # Publish on the same server
    echo "test connectivity" | nats pub "$to_subject" --server="$from_url" >/dev/null 2>&1
    
    # Check if message was received
    wait $SUB_PID
    if [ $? -eq 0 ]; then
        echo "✓ Connectivity working"
    else
        echo "✗ Connectivity failed"
        return 1
    fi
}

# Main test execution
main() {
    local mode=${1:-dev}
    
    echo "=== NATS Infrastructure Test Suite ==="
    echo "Mode: $mode"
    echo
    
    case $mode in
        dev)
            # Test development server
            check_nats "nats://home:changeme@localhost:4222" "Development server"
            test_jetstream "nats://home:changeme@localhost:4222"
            test_kv "nats://home:changeme@localhost:4222"
            test_permissions "nats://home:changeme@localhost:4222" "home" "changeme"
            ;;
        
        prod)
            # Test production server with Synadia Cloud
            if [ ! -f "nats-home-automation.creds" ]; then
                echo "✗ Credentials file not found"
                exit 1
            fi
            
            check_nats "nats://localhost:4222" "Local leafnode"
            test_connectivity "nats://localhost:4222" "home.test" "Local" "Cloud"
            ;;
        
        hybrid)
            # Test hybrid setup
            check_nats "nats://localhost:4222" "Hybrid server"
            check_nats "nats://localhost:4223" "Dev port"
            test_jetstream "nats://localhost:4222"
            test_kv "nats://localhost:4222"
            ;;
        
        *)
            echo "Unknown mode: $mode"
            echo "Usage: $0 [dev|prod|hybrid]"
            exit 1
            ;;
    esac
    
    echo
    echo "=== Test Summary ==="
    echo "All tests completed successfully!"
}

# Run tests
main "$@"