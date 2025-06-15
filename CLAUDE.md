# Nova - Claude Assistant Guide

## Project Overview
This is a home automation system built on NATS messaging, providing a scalable, event-driven architecture for managing smart home devices and automations.

### Architectural Vision
**Target Architecture**: Cloud-managed home automation with local execution
- **Cloud Management**: All configuration and management happens in Synadia Cloud
- **Local Execution**: Critical automations run on local NATS leaf nodes at each home
- **Multi-Tenancy**: Support multiple homes through NATS accounts
- **Security First**: Per-device JWT credentials using account signing keys
- **Leaf Node Architecture**: Homes connect to cloud via secure leaf connections

**Current State**: The implementation currently runs fully locally with basic auth. See `/docs/architecture-analysis.md` for migration path to target architecture.

### Key Technologies
- **NATS**: Core messaging system with JetStream for persistence
- **Go**: Backend services (Discovery, Health Monitor, Management UI)
- **JavaScript**: Frontend visual automation designer
- **Docker/Podman**: Container orchestration
- **KV Store**: NATS KV buckets for state management

## Architecture

### Cloud and Security Architecture
- The architectural target is to manage the home in the cloud while running crucial services locally at home
- NATS and Synadia Cloud provide an ideal solution with support for multiple accounts and leaf-node connections
- Leaf-nodes allow running automations and critical operations locally while managing everything in the cloud
- Security is a primary concern, leveraging NATS' built-in security capabilities
- Synadia Cloud uses accounts to which users can be assigned:
  - Users can be humans, third-party systems, or devices
  - Every device has its own set of credentials
  - Each account can generate a signing key to create new users

### Services
1. **NATS Server** (port 4222) - Core messaging backbone with JetStream enabled
   - WebSocket: port 9222
   - HTTP Monitor: port 8222
2. **Discovery Service** - Automatic device discovery and registration
3. **Health Monitor** (port 8082) - System health monitoring and dashboards
4. **Management UI** (port 8081) - Web interface with visual automation designer
5. **Device Simulator** (port 8083) - Web-based device simulation for testing
   - Uses dedicated 'simulator' user for NATS access

[... rest of the existing content remains unchanged ...]