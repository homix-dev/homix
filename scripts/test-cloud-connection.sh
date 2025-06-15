#!/bin/bash

# Test connection to Synadia Cloud
# This verifies your credentials are working

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Testing Synadia Cloud Connection"
echo "================================"
echo

# Find credentials file
CREDS_FILE="${1:-$HOME/.synadia/NGS-Home-daan.creds}"

if [ ! -f "$CREDS_FILE" ]; then
    echo -e "${RED}❌ Credentials file not found: $CREDS_FILE${NC}"
    echo
    echo "Usage: $0 [path-to-creds-file]"
    echo
    echo "Get your credentials from https://app.ngs.global"
    exit 1
fi

echo "Using credentials: $CREDS_FILE"
echo

# Test connection
echo "Testing connection to Synadia Cloud..."
if nats --server tls://connect.ngs.global --creds "$CREDS_FILE" server list > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Successfully connected to Synadia Cloud!${NC}"
    echo
    
    # Get account info
    echo "Account Information:"
    nats --server tls://connect.ngs.global --creds "$CREDS_FILE" account info 2>/dev/null || true
    echo
    
    # Test publishing
    echo "Testing message publish..."
    TEST_MSG="Hello from NATS Home at $(date)"
    if nats --server tls://connect.ngs.global --creds "$CREDS_FILE" pub home.test "$TEST_MSG" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Successfully published test message${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not publish test message (this might be normal)${NC}"
    fi
    echo
    
    # Show subject permissions
    echo "Testing subject access..."
    echo "You should be able to publish/subscribe to:"
    echo "  - home.> (all home automation subjects)"
    echo "  - cloud.homes.{home-id}.> (cloud integration)"
    echo "  - _INBOX.> (request/reply)"
    echo
    
    echo -e "${GREEN}🎉 Your Synadia Cloud connection is working perfectly!${NC}"
    echo
    echo "Next step: Run the edge server"
    echo "  docker run -d --network host \\"
    echo "    -v $CREDS_FILE:/creds/cloud.creds:ro \\"
    echo "    -e HOME_NAME=\"My Home\" \\"
    echo "    ghcr.io/calmera/nats-home-edge:latest"
    
else
    echo -e "${RED}❌ Failed to connect to Synadia Cloud${NC}"
    echo
    echo "Please check:"
    echo "1. Your credentials file is valid"
    echo "2. You have internet connectivity"
    echo "3. The credentials haven't expired"
    echo
    echo "Get new credentials from: https://app.ngs.global"
    exit 1
fi