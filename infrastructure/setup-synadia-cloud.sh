#!/bin/bash

# Setup script for Synadia Cloud connection
# This script helps configure the NATS server for cloud connectivity

set -e

echo "=== NATS Home Automation - Synadia Cloud Setup ==="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_requirements() {
    echo "Checking requirements..."
    
    if ! command -v nsc &> /dev/null; then
        echo -e "${RED}NSC (NATS Account Management) is not installed.${NC}"
        echo "Install it with: curl -L https://raw.githubusercontent.com/nats-io/nsc/master/install.sh | sh"
        exit 1
    fi
    
    if ! command -v nats &> /dev/null; then
        echo -e "${YELLOW}NATS CLI is not installed. Some operations may fail.${NC}"
        echo "Install it from: https://github.com/nats-io/natscli/releases"
    fi
    
    echo -e "${GREEN}✓ Requirements satisfied${NC}"
}

# Initialize NSC for local operator
init_local_operator() {
    echo
    echo "Initializing local operator for development..."
    
    # Check if operator exists
    if nsc describe operator HomeAutomation &> /dev/null; then
        echo "Operator 'HomeAutomation' already exists, using existing..."
    else
        # Create operator
        nsc add operator --name "HomeAutomation" --sys
    fi
    
    # Set as default
    nsc env -o HomeAutomation
    
    # Check if account exists
    if nsc describe account HOME &> /dev/null; then
        echo "Account 'HOME' already exists, using existing..."
    else
        # Create main account
        nsc add account --name "HOME"
    fi
    
    # Generate signing key if it doesn't exist
    if ! nsc describe account HOME | grep -q "Signing Keys"; then
        nsc edit account HOME --sk generate
    fi
    
    echo -e "${GREEN}✓ Local operator initialized${NC}"
}

# Create service users
create_service_users() {
    echo
    echo "Creating service users..."
    
    # Management UI user
    if ! nsc describe user --account HOME management-ui &> /dev/null; then
        nsc add user --account HOME --name management-ui
    else
        echo "User 'management-ui' already exists"
    fi
    
    # Discovery service user  
    if ! nsc describe user --account HOME discovery-service &> /dev/null; then
        nsc add user --account HOME --name discovery-service
    else
        echo "User 'discovery-service' already exists"
    fi
    
    # Health monitor user
    if ! nsc describe user --account HOME health-monitor &> /dev/null; then
        nsc add user --account HOME --name health-monitor
    else
        echo "User 'health-monitor' already exists"
    fi
    
    # Device provisioning service user (has ability to create new users)
    if ! nsc describe user --account HOME device-provisioner &> /dev/null; then
        nsc add user --account HOME --name device-provisioner \
            --allow-pub "home.provisioning.>" \
            --allow-sub "home.provisioning.>" \
            --allow-pub-response
    else
        echo "User 'device-provisioner' already exists"
    fi
    
    echo -e "${GREEN}✓ Service users created${NC}"
}

# Create sample device credentials
create_device_credentials() {
    echo
    echo "Creating sample device credentials..."
    
    # Create a few sample device users
    if ! nsc describe user --account HOME device-light-001 &> /dev/null; then
        nsc add user --account HOME --name device-light-001 \
            --allow-pub "home.devices.light.001.>" \
            --allow-sub "home.devices.light.001.>" \
            --allow-pub "\$JS.API.CONSUMER.MSG.NEXT.>" \
            --allow-sub "_INBOX.>"
    else
        echo "User 'device-light-001' already exists"
    fi
        
    if ! nsc describe user --account HOME device-sensor-001 &> /dev/null; then
        nsc add user --account HOME --name device-sensor-001 \
            --allow-pub "home.devices.sensor.001.>" \
            --allow-sub "home.devices.sensor.001.>" \
            --allow-pub "\$JS.API.CONSUMER.MSG.NEXT.>" \
            --allow-sub "_INBOX.>"
    else
        echo "User 'device-sensor-001' already exists"
    fi
    
    echo -e "${GREEN}✓ Sample device credentials created${NC}"
}

# Generate JWT files
generate_jwt_files() {
    echo
    echo "Generating JWT files..."
    
    # Create directories
    mkdir -p ./jwt
    mkdir -p ./creds
    
    # Generate account JWT
    nsc describe account HOME --json > ./jwt/HOME.json
    nsc describe account HOME --raw > ./jwt/HOME.jwt
    
    # Generate user credentials
    nsc generate creds --account HOME --name management-ui > ./creds/management-ui.creds
    nsc generate creds --account HOME --name discovery-service > ./creds/discovery-service.creds
    nsc generate creds --account HOME --name health-monitor > ./creds/health-monitor.creds
    nsc generate creds --account HOME --name device-provisioner > ./creds/device-provisioner.creds
    
    # Sample device creds
    nsc generate creds --account HOME --name device-light-001 > ./creds/device-light-001.creds
    nsc generate creds --account HOME --name device-sensor-001 > ./creds/device-sensor-001.creds
    
    echo -e "${GREEN}✓ JWT files generated${NC}"
}

# Setup Synadia Cloud connection
setup_cloud_connection() {
    echo
    echo "Setting up Synadia Cloud connection..."
    echo
    echo -e "${YELLOW}To connect to Synadia Cloud:${NC}"
    echo "1. Sign up at https://app.ngs.global"
    echo "2. Create a new account for your home"
    echo "3. Download the account credentials"
    echo "4. Place the credentials file at: ./creds/synadia-cloud.creds"
    echo
    echo "Then uncomment the leaf node configuration in nats-server-cloud.conf"
}

# Create docker-compose override for cloud setup
create_compose_override() {
    echo
    echo "Creating docker-compose override..."
    
    # Create in the parent directory (project root)
    cat > ../docker-compose.cloud.yml << 'EOF'
# Docker Compose override for cloud-connected deployment
services:
  nats:
    volumes:
      - ./infrastructure/nats-server-cloud.conf:/etc/nats/nats-server.conf:ro
      - ./infrastructure/jwt:/data/jwt:ro
      - ./infrastructure/creds:/creds:ro
    environment:
      - NATS_SERVER_NAME=home-${HOME_ID:-default}
      - JETSTREAM_DOMAIN=home-${HOME_ID:-default}
      - LEAF_ACCOUNT=HOME

  discovery:
    volumes:
      - ./infrastructure/creds/discovery-service.creds:/app/nats.creds:ro
    environment:
      - NATS_URL=nats://nats:4222
      - NATS_CREDS=/app/nats.creds
    command: ["./discovery", "--nats-url", "nats://nats:4222", "--creds", "/app/nats.creds"]

  management-ui:
    volumes:
      - ./infrastructure/creds/management-ui.creds:/app/nats.creds:ro
    environment:
      - NATS_URL=nats://nats:4222
      - NATS_CREDS=/app/nats.creds
    command: ["./management-ui", "--nats-url", "nats://nats:4222", "--creds", "/app/nats.creds", "--http-addr", ":8081"]

  health-monitor:
    image: ${HEALTH_MONITOR_IMAGE:-nats-health-monitor:latest}
    build:
      context: ./services/health-monitor
      dockerfile: Dockerfile
    volumes:
      - ./infrastructure/creds/health-monitor.creds:/app/nats.creds:ro
    environment:
      - NATS_URL=nats://nats:4222
      - NATS_CREDS=/app/nats.creds
    command: ["./health-monitor", "--nats-url", "nats://nats:4222", "--creds", "/app/nats.creds", "--http-addr", ":8082"]

  # Device provisioner service
  device-provisioner:
    image: ${PROVISIONER_IMAGE:-nats-device-provisioner:latest}
    build:
      context: ./services/device-provisioner
      dockerfile: Dockerfile
    container_name: nats-device-provisioner
    depends_on:
      - nats
    volumes:
      - ./infrastructure/creds/device-provisioner.creds:/app/nats.creds:ro
    environment:
      - NATS_URL=nats://nats:4222
      - NATS_CREDS=/app/nats.creds
      - SIGNING_KEY=${SIGNING_KEY}
      - ACCOUNT_PUB=${ACCOUNT_PUB}
    command: ["./device-provisioner", "--nats-url", "nats://nats:4222", "--creds", "/app/nats.creds"]
    restart: unless-stopped
    networks:
      - nats-network
EOF

    echo -e "${GREEN}✓ Docker compose override created${NC}"
}

# Main execution
main() {
    check_requirements
    
    echo
    echo "This script will set up JWT-based authentication for the home automation system."
    echo -e "${YELLOW}This will create a new NSC operator. Continue? (y/N)${NC}"
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    init_local_operator
    create_service_users
    create_device_credentials
    generate_jwt_files
    create_compose_override
    setup_cloud_connection
    
    echo
    echo -e "${GREEN}=== Setup Complete ===${NC}"
    echo
    echo "Next steps:"
    echo "1. Review the generated credentials in ./creds/"
    echo "2. To run with JWT auth: docker-compose -f docker-compose.yml -f docker-compose.cloud.yml up"
    echo "3. Set up Synadia Cloud connection when ready"
    echo
    echo "Generated files:"
    echo "  - JWT files: ./jwt/"
    echo "  - Credentials: ./creds/"
    echo "  - Docker override: docker-compose.cloud.yml"
}

main "$@"