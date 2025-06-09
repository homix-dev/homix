#!/bin/bash
# Simple test runner for NATS Home Automation

set -e

echo "=== NATS Home Automation Test Suite ==="
echo

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
SKIPPED=0

# Function to run tests in a directory
run_go_tests() {
    local dir=$1
    local name=$2
    
    echo -e "${YELLOW}Testing $name...${NC}"
    
    if [ -d "$dir" ]; then
        cd "$dir"
        
        # Check if go.mod exists
        if [ -f "go.mod" ]; then
            # Update dependencies
            go mod tidy >/dev/null 2>&1 || true
            
            # Run tests
            if go test ./... -v 2>&1 | grep -E "(PASS|FAIL|ok|^=== RUN)"; then
                echo -e "${GREEN}✓ $name tests passed${NC}"
                ((PASSED++))
            else
                echo -e "${RED}✗ $name tests failed${NC}"
                ((FAILED++))
            fi
        else
            echo -e "${YELLOW}⚠ No go.mod found, skipping${NC}"
            ((SKIPPED++))
        fi
        
        cd - >/dev/null
    else
        echo -e "${RED}✗ Directory not found: $dir${NC}"
        ((FAILED++))
    fi
    
    echo
}

# Function to run Python tests
run_python_tests() {
    local dir=$1
    local name=$2
    
    echo -e "${YELLOW}Testing $name...${NC}"
    
    if [ -d "$dir" ]; then
        cd "$dir"
        
        # Check if tests exist
        if [ -d "tests" ]; then
            # Check if pytest is available
            if command -v pytest >/dev/null 2>&1; then
                if pytest tests/ -v --tb=short; then
                    echo -e "${GREEN}✓ $name tests passed${NC}"
                    ((PASSED++))
                else
                    echo -e "${RED}✗ $name tests failed${NC}"
                    ((FAILED++))
                fi
            else
                echo -e "${YELLOW}⚠ pytest not found, install with: pip install pytest${NC}"
                ((SKIPPED++))
            fi
        else
            echo -e "${YELLOW}⚠ No tests directory found${NC}"
            ((SKIPPED++))
        fi
        
        cd - >/dev/null
    else
        echo -e "${RED}✗ Directory not found: $dir${NC}"
        ((FAILED++))
    fi
    
    echo
}

# Main test execution
main() {
    # Go to project root
    cd "$(dirname "$0")/.."
    
    echo "Running unit tests..."
    echo "===================="
    echo
    
    # Go tests
    run_go_tests "services/discovery" "Discovery Service"
    run_go_tests "bridges/mqtt-nats" "MQTT-NATS Bridge"
    run_go_tests "tools/nats-ha-cli" "CLI Tool"
    
    # Python tests
    echo -e "${YELLOW}Checking Python environment...${NC}"
    if command -v python3 >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Python3 found: $(python3 --version)${NC}"
        run_python_tests "ha-integration" "Home Assistant Integration"
    else
        echo -e "${RED}✗ Python3 not found${NC}"
        ((SKIPPED++))
    fi
    
    echo
    echo "===================="
    echo "Test Summary"
    echo "===================="
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
    echo
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed! 🎉${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed 😞${NC}"
        exit 1
    fi
}

# Run tests
main "$@"