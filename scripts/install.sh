#!/bin/bash

# Nova - Installer Script
# This script sets up the edge server with minimal configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ASCII Art Banner
echo -e "${BLUE}"
cat << "EOF"
 _   _                   
| \ | | _____   ____ _   
|  \| |/ _ \ \ / / _` |  
| |\  | (_) \ V / (_| |  
|_| \_|\___/ \_/ \__,_|  
                         
EOF
echo -e "${NC}"
echo "Welcome to Nova Setup!"
echo "======================================"
echo

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check for Docker/Podman
    if command -v docker &> /dev/null; then
        CONTAINER_TOOL="docker"
    elif command -v podman &> /dev/null; then
        CONTAINER_TOOL="podman"
    else
        echo -e "${RED}❌ Neither Docker nor Podman found!${NC}"
        echo "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Container runtime: $CONTAINER_TOOL"
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then 
        echo -e "${YELLOW}⚠️  Running as root is not recommended${NC}"
    fi
    
    echo
}

# Get Synadia Cloud credentials
get_credentials() {
    echo "Synadia Cloud Setup"
    echo "=================="
    echo
    echo "You need a Synadia Cloud account (free tier works great!)"
    echo "Sign up at: https://app.ngs.global"
    echo
    
    # Check for existing credentials
    DEFAULT_CREDS="$HOME/.synadia/NGS-Home-*.creds"
    CREDS_FILE=""
    
    for file in $DEFAULT_CREDS; do
        if [ -f "$file" ]; then
            CREDS_FILE="$file"
            break
        fi
    done
    
    if [ -n "$CREDS_FILE" ]; then
        echo -e "${GREEN}✓${NC} Found credentials: $CREDS_FILE"
        read -p "Use this file? (Y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            SYNADIA_CREDS="$CREDS_FILE"
        fi
    fi
    
    if [ -z "$SYNADIA_CREDS" ]; then
        read -p "Path to Synadia credentials file: " SYNADIA_CREDS
        
        # Expand tilde
        SYNADIA_CREDS="${SYNADIA_CREDS/#\~/$HOME}"
        
        if [ ! -f "$SYNADIA_CREDS" ]; then
            echo -e "${RED}❌ Credentials file not found: $SYNADIA_CREDS${NC}"
            exit 1
        fi
    fi
    
    echo
}

# Configure home settings
configure_home() {
    echo "Home Configuration"
    echo "=================="
    echo
    
    # Home name
    read -p "Enter a name for your home (e.g., 'Main House'): " HOME_NAME
    if [ -z "$HOME_NAME" ]; then
        HOME_NAME="My Home"
    fi
    
    # Location (optional)
    echo
    echo "Location is optional but enables sunrise/sunset automations"
    read -p "Enter your latitude (or press Enter to skip): " HOME_LAT
    read -p "Enter your longitude (or press Enter to skip): " HOME_LON
    
    # Timezone
    if command -v timedatectl &> /dev/null; then
        DETECTED_TZ=$(timedatectl | grep "Time zone" | awk '{print $3}')
        read -p "Timezone [$DETECTED_TZ]: " HOME_TZ
        if [ -z "$HOME_TZ" ]; then
            HOME_TZ="$DETECTED_TZ"
        fi
    else
        read -p "Timezone (e.g., America/New_York): " HOME_TZ
    fi
    
    echo
}

# Create necessary directories
setup_directories() {
    echo "Setting up directories..."
    
    INSTALL_DIR="$HOME/nova"
    mkdir -p "$INSTALL_DIR/data"
    mkdir -p "$INSTALL_DIR/config"
    
    echo -e "${GREEN}✓${NC} Created $INSTALL_DIR"
    echo
}

# Generate docker-compose file
generate_compose() {
    echo "Generating configuration..."
    
    cat > "$INSTALL_DIR/docker-compose.yml" << EOF
version: '3.8'

services:
  edge:
    image: ghcr.io/calmera/nova-edge:latest
    container_name: nova-edge
    restart: unless-stopped
    network_mode: host
    
    volumes:
      - $SYNADIA_CREDS:/creds/cloud.creds:ro
      - ./data:/data
    
    environment:
      - HOME_NAME=$HOME_NAME
EOF

    # Add location if provided
    if [ -n "$HOME_LAT" ] && [ -n "$HOME_LON" ]; then
        cat >> "$INSTALL_DIR/docker-compose.yml" << EOF
      - HOME_LAT=$HOME_LAT
      - HOME_LON=$HOME_LON
EOF
    fi
    
    # Add timezone if provided
    if [ -n "$HOME_TZ" ]; then
        cat >> "$INSTALL_DIR/docker-compose.yml" << EOF
      - HOME_TZ=$HOME_TZ
EOF
    fi
    
    echo -e "${GREEN}✓${NC} Generated docker-compose.yml"
    echo
}

# Create helper scripts
create_helpers() {
    echo "Creating helper scripts..."
    
    # Start script
    cat > "$INSTALL_DIR/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker compose up -d
echo "Nova Edge started!"
echo "View logs: docker logs -f nova-edge"
EOF
    chmod +x "$INSTALL_DIR/start.sh"
    
    # Stop script
    cat > "$INSTALL_DIR/stop.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker compose down
echo "Nova Edge stopped!"
EOF
    chmod +x "$INSTALL_DIR/stop.sh"
    
    # Update script
    cat > "$INSTALL_DIR/update.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker compose pull
docker compose up -d
echo "Nova Edge updated!"
EOF
    chmod +x "$INSTALL_DIR/update.sh"
    
    # Logs script
    cat > "$INSTALL_DIR/logs.sh" << 'EOF'
#!/bin/bash
docker logs -f nova-edge
EOF
    chmod +x "$INSTALL_DIR/logs.sh"
    
    echo -e "${GREEN}✓${NC} Created helper scripts"
    echo
}

# Start the edge server
start_edge() {
    echo "Starting Nova Edge..."
    
    cd "$INSTALL_DIR"
    $CONTAINER_TOOL compose up -d
    
    # Wait for container to start
    sleep 5
    
    # Check if running
    if $CONTAINER_TOOL ps | grep -q nova-edge; then
        echo -e "${GREEN}✓${NC} Edge server started successfully!"
    else
        echo -e "${RED}❌ Failed to start edge server${NC}"
        echo "Check logs: $CONTAINER_TOOL logs nova-edge"
        exit 1
    fi
    
    echo
}

# Print success message
print_success() {
    echo -e "${GREEN}"
    echo "======================================"
    echo "✨ Setup Complete! ✨"
    echo "======================================"
    echo -e "${NC}"
    echo
    echo "Your home automation system is now running!"
    echo
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Open https://nova.cloud in your browser"
    echo "2. Log in with your Synadia Cloud account"
    echo "3. Your home '$HOME_NAME' should appear automatically"
    echo
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  View logs:  $INSTALL_DIR/logs.sh"
    echo "  Stop:       $INSTALL_DIR/stop.sh"
    echo "  Start:      $INSTALL_DIR/start.sh"
    echo "  Update:     $INSTALL_DIR/update.sh"
    echo
    echo -e "${BLUE}Add your first device:${NC}"
    echo "  ESPHome:    https://docs.nova.sh/devices/esphome"
    echo "  Zigbee:     https://docs.nova.sh/devices/zigbee"
    echo "  MQTT:       https://docs.nova.sh/devices/mqtt"
    echo
    echo "Happy automating! 🏠🤖"
}

# Main installation flow
main() {
    check_prerequisites
    get_credentials
    configure_home
    setup_directories
    generate_compose
    create_helpers
    start_edge
    print_success
}

# Run main function
main