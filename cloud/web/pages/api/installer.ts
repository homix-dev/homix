import { NextApiRequest, NextApiResponse } from 'next'

const INSTALLER_SCRIPT = `#!/bin/bash
#
# Homix Installer Script
# https://homix.dev
#

set -e

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Configuration
HOMIX_VERSION="\${HOMIX_VERSION:-latest}"
HOMIX_DIR="\${HOMIX_DIR:-\$HOME/.homix}"
GITHUB_REPO="calmera/homix"

# Banner
echo -e "\${BLUE}"
echo "  _    _                 _      "
echo " | |  | |               (_)     "
echo " | |__| | ___  _ __ ___  ___  __"
echo " |  __  |/ _ \\| '_ \` _ \\| \\ \\/ /"
echo " | |  | | (_) | | | | | | |>  < "
echo " |_|  |_|\\___/|_| |_| |_|_/_/\\_\\"
echo -e "\${NC}"
echo -e "\${GREEN}Home automation, beautifully mixed\${NC}"
echo ""

# Check prerequisites
echo -e "\${BLUE}Checking prerequisites...\${NC}"

# Check for Docker or Podman
if command -v docker &> /dev/null; then
    CONTAINER_TOOL="docker"
elif command -v podman &> /dev/null; then
    CONTAINER_TOOL="podman"
else
    echo -e "\${RED}Error: Neither Docker nor Podman is installed.\${NC}"
    echo "Please install Docker or Podman first:"
    echo "  - Docker: https://docs.docker.com/get-docker/"
    echo "  - Podman: https://podman.io/getting-started/installation"
    exit 1
fi

echo -e "\${GREEN}✓\${NC} Found \$CONTAINER_TOOL"

# Check for required tools
for tool in curl jq; do
    if ! command -v \$tool &> /dev/null; then
        echo -e "\${RED}Error: \$tool is not installed.\${NC}"
        exit 1
    fi
    echo -e "\${GREEN}✓\${NC} Found \$tool"
done

# Create Homix directory
echo ""
echo -e "\${BLUE}Setting up Homix directory...\${NC}"
mkdir -p "\$HOMIX_DIR"
cd "\$HOMIX_DIR"

# Check for Synadia credentials
echo ""
echo -e "\${BLUE}Checking for Synadia Cloud credentials...\${NC}"

CREDS_FILE=""
if [ -f "\$HOME/.synadia/NGS-Home.creds" ]; then
    CREDS_FILE="\$HOME/.synadia/NGS-Home.creds"
elif ls \$HOME/.synadia/NGS-*.creds 1> /dev/null 2>&1; then
    CREDS_FILE=\$(ls \$HOME/.synadia/NGS-*.creds | head -n 1)
fi

if [ -z "\$CREDS_FILE" ]; then
    echo -e "\${YELLOW}Warning: No Synadia Cloud credentials found.\${NC}"
    echo ""
    echo "To set up Synadia Cloud:"
    echo "1. Sign up at https://app.ngs.global"
    echo "2. Create a context called 'home'"
    echo "3. Download your credentials to ~/.synadia/"
    echo ""
    read -p "Continue without cloud connection? (y/N) " -n 1 -r
    echo
    if [[ ! \$REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "\${GREEN}✓\${NC} Found credentials: \$CREDS_FILE"
fi

# Create docker-compose.yml
echo ""
echo -e "\${BLUE}Creating configuration...\${NC}"

cat > docker-compose.yml << EOF
version: '3.8'

services:
  edge:
    image: ghcr.io/\${GITHUB_REPO}/homix-edge:\${HOMIX_VERSION}
    container_name: homix-edge
    restart: unless-stopped
    network_mode: host
    volumes:
EOF

if [ -n "\$CREDS_FILE" ]; then
    echo "      - \$CREDS_FILE:/creds/cloud.creds:ro" >> docker-compose.yml
fi

cat >> docker-compose.yml << EOF
      - ./data:/data
      - ./config:/config
    environment:
      - HOME_NAME=\${HOME_NAME:-My Home}
      - HOME_LAT=\${HOME_LAT}
      - HOME_LON=\${HOME_LON}
      - HOME_TZ=\${HOME_TZ:-America/New_York}
      - LOG_LEVEL=\${LOG_LEVEL:-info}
      - CONTAINER_TOOL=\${CONTAINER_TOOL}
EOF

# Create .env file
cat > .env << EOF
# Homix Configuration
HOME_NAME=My Home
# HOME_LAT=
# HOME_LON=
# HOME_TZ=America/New_York
LOG_LEVEL=info
HOMIX_VERSION=\$HOMIX_VERSION
GITHUB_REPO=\$GITHUB_REPO
EOF

# Create directories
mkdir -p data config

# Pull the image
echo ""
echo -e "\${BLUE}Pulling Homix Edge image...\${NC}"
\$CONTAINER_TOOL pull ghcr.io/\$GITHUB_REPO/homix-edge:\$HOMIX_VERSION

# Start Homix
echo ""
echo -e "\${BLUE}Starting Homix Edge...\${NC}"
\$CONTAINER_TOOL compose up -d

# Wait for startup
echo -e "\${BLUE}Waiting for Homix to start...\${NC}"
sleep 5

# Check status
if \$CONTAINER_TOOL ps | grep -q homix-edge; then
    echo -e "\${GREEN}✓ Homix Edge is running!\${NC}"
else
    echo -e "\${RED}✗ Failed to start Homix Edge\${NC}"
    echo "Check logs with: \$CONTAINER_TOOL logs homix-edge"
    exit 1
fi

# Success message
echo ""
echo -e "\${GREEN}🎉 Homix installation complete!\${NC}"
echo ""
echo "Next steps:"
echo "1. Access the local dashboard: http://localhost:8080"
if [ -n "\$CREDS_FILE" ]; then
    echo "2. Access the cloud UI: https://app.homix.dev"
else
    echo "2. Set up Synadia Cloud: https://app.ngs.global"
fi
echo "3. Add your first device"
echo ""
echo "Useful commands:"
echo "  • View logs: cd \$HOMIX_DIR && \$CONTAINER_TOOL compose logs -f"
echo "  • Stop Homix: cd \$HOMIX_DIR && \$CONTAINER_TOOL compose down"
echo "  • Update Homix: cd \$HOMIX_DIR && \$CONTAINER_TOOL compose pull && \$CONTAINER_TOOL compose up -d"
echo ""
echo "Documentation: https://docs.homix.dev"
echo "Discord: https://discord.gg/homix"
`

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set appropriate headers for shell script
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  
  // Return the installer script
  res.status(200).send(INSTALLER_SCRIPT)
}