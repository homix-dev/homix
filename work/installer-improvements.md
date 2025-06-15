# Installer Improvements - Container Tool Detection

## Issues Fixed

### 1. Better Container Tool Detection
- **Docker Compose v2 Support**: Now checks for `docker compose` (modern) vs `docker-compose` (legacy)
- **Podman Support**: Properly detects `podman-compose` and built-in `podman compose`
- **Clear Error Messages**: Detailed installation instructions for each platform

### 2. Improved Error Handling
- **Missing Docker**: Provides specific installation instructions for macOS, Windows, Linux
- **Missing Compose**: Distinguishes between missing Docker vs missing Docker Compose
- **Platform-Specific Guidance**: Different instructions for different operating systems

### 3. Correct Repository Reference
- **Fixed GitHub repo**: Changed from `calmera/homix` to `calmera/nats-home-automation`
- **Matches actual repository**: Container images will pull from correct location

### 4. Better Commands
- **Proper Compose Usage**: Uses detected compose command (`docker compose` vs `docker-compose`)
- **Consistent Tool Usage**: All commands use the detected container tool and compose command

## New Detection Logic

```bash
# Detects Docker + Compose
if command -v docker &> /dev/null; then
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"  # Modern Docker
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"  # Legacy Docker
    fi
fi

# Detects Podman + Compose
elif command -v podman &> /dev/null; then
    if command -v podman-compose &> /dev/null; then
        COMPOSE_CMD="podman-compose"  # External tool
    elif podman compose version &> /dev/null; then
        COMPOSE_CMD="podman compose"  # Built-in
    fi
fi
```

## Error Messages Improved

### Before:
```
Error: Neither Docker nor Podman is installed.
Please install Docker or Podman first:
  - Docker: https://docs.docker.com/get-docker/
  - Podman: https://podman.io/getting-started/installation
```

### After:
```
Error: Neither Docker nor Podman is installed.

Please install one of the following:

Option 1: Docker Desktop (Recommended)
  - macOS: https://docs.docker.com/desktop/install/mac-install/
  - Windows: https://docs.docker.com/desktop/install/windows-install/
  - Linux: https://docs.docker.com/desktop/install/linux-install/

Option 2: Docker Engine (Linux)
  - Ubuntu/Debian: apt install docker.io docker-compose-plugin
  - RHEL/CentOS: dnf install docker docker-compose-plugin

Option 3: Podman (Alternative)
  - https://podman.io/getting-started/installation
  - Also install: pip install podman-compose
```

## Testing
- ✅ Syntax validation passed
- ✅ Better error messages
- ✅ Proper container tool detection
- ✅ Deployed successfully

## Ready for Use
The installer now properly detects and handles different container configurations!