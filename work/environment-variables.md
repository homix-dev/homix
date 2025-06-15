# Environment Variable Support in Installer

## Overview
The Homix installer now supports environment variables to override automatic detection and provide more control over the installation process.

## Supported Environment Variables

### `CONTAINER_TOOL`
Override the container runtime selection.

**Valid values:** `docker`, `podman`

**Examples:**
```bash
# Force Docker (even if Podman is also available)
curl -sSL https://get.homix.dev | CONTAINER_TOOL=docker sh

# Force Podman (even if Docker is also available)  
curl -sSL https://get.homix.dev | CONTAINER_TOOL=podman sh

# Alternative: Download first, then run with environment
curl -sSL https://get.homix.dev > install.sh
CONTAINER_TOOL=podman bash install.sh
```

### `COMPOSE_CMD`
Override the compose command selection.

**Valid values:** `docker compose`, `docker-compose`, `podman compose`, `podman-compose`

**Examples:**
```bash
# Force legacy docker-compose command
curl -sSL https://get.homix.dev | CONTAINER_TOOL=docker COMPOSE_CMD="docker-compose" sh

# Use custom podman-compose path
curl -sSL https://get.homix.dev | CONTAINER_TOOL=podman COMPOSE_CMD="/usr/local/bin/podman-compose" sh
```

### `HOMIX_VERSION`
Override the version of Homix to install.

**Default:** `latest`

**Examples:**
```bash
# Install specific version
curl -sSL https://get.homix.dev | HOMIX_VERSION=v1.0.0 sh

# Install development version
curl -sSL https://get.homix.dev | HOMIX_VERSION=dev sh
```

### `HOMIX_DIR`
Override the installation directory.

**Default:** `$HOME/.homix`

**Example:**
```bash
# Install in custom directory
curl -sSL https://get.homix.dev | HOMIX_DIR=/opt/homix sh
```

## Use Cases

### 1. Multi-Container Environments
If you have both Docker and Podman installed but want to ensure a specific one is used:
```bash
curl -sSL https://get.homix.dev | CONTAINER_TOOL=podman sh
```

### 2. Legacy Docker Installations
For systems with older Docker that only has `docker-compose` (not `docker compose`):
```bash
curl -sSL https://get.homix.dev | CONTAINER_TOOL=docker COMPOSE_CMD="docker-compose" sh
```

### 3. Custom Installations
For non-standard installation paths or custom compose commands:
```bash
curl -sSL https://get.homix.dev | CONTAINER_TOOL=podman COMPOSE_CMD="/opt/podman/bin/podman-compose" sh
```

### 4. CI/CD Environments
For consistent installations in automated environments:
```bash
curl -sSL https://get.homix.dev | CONTAINER_TOOL=docker HOMIX_VERSION=v1.2.3 HOMIX_DIR=/app/homix sh
```

## Environment Variable Display
When environment variables are set, the installer will display them at startup:

```
================================
       Homix Installer
================================
Home automation, beautifully mixed

Environment variables:
  CONTAINER_TOOL=podman
  COMPOSE_CMD=podman-compose
  HOMIX_VERSION=latest
```

## Error Handling
- **Invalid CONTAINER_TOOL**: Shows error with valid options
- **Missing Commands**: Validates that specified tools actually exist
- **Compose Detection**: Auto-detects compose command if COMPOSE_CMD not set
- **Override Validation**: Ensures overridden commands work before proceeding

## Backward Compatibility
- All environment variables are optional
- Installer still auto-detects when no overrides are provided
- Existing installation commands continue to work unchanged