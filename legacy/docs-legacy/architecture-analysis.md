# Architecture Analysis: Current vs Target Cloud-First Design

## Executive Summary

The current implementation has diverged significantly from the target cloud-first architecture. Instead of a cloud-managed system with local leaf nodes, we have a fully local deployment with basic authentication.

## Key Architectural Divergences

### 1. Cloud Connectivity
**Target**: Management in Synadia Cloud with home-based leaf nodes
**Current**: Fully local deployment, no cloud connectivity

### 2. Authentication Model
**Target**: JWT-based auth with per-device credentials using account signing keys
**Current**: Basic username/password auth with shared credentials

### 3. Multi-Tenancy
**Target**: Multiple accounts for multiple homes
**Current**: Single deployment, no account separation

### 4. Security Architecture
**Target**: Each device/user/service has unique credentials
**Current**: Shared credentials (home:changeme) for all services

## Detailed Analysis

### Current Architecture

```
┌─────────────────────────────────────────┐
│         Local Home Network              │
│                                         │
│  ┌─────────┐  ┌──────────┐  ┌────────┐│
│  │Discovery│  │Management│  │ Health ││
│  │Service  │  │    UI    │  │Monitor ││
│  └────┬────┘  └────┬─────┘  └───┬────┘│
│       │            │             │      │
│       └────────────┼─────────────┘      │
│                    │                    │
│              ┌─────▼─────┐              │
│              │   NATS    │              │
│              │  Server   │              │
│              │(local only)│             │
│              └───────────┘              │
│                                         │
│     Devices use shared credentials      │
└─────────────────────────────────────────┘
```

### Target Architecture

```
┌─────────────────────────────────────────┐
│           Synadia Cloud                 │
│  ┌────────────────────────────────┐    │
│  │    Account: Home-123           │    │
│  │  ┌──────────┐  ┌─────────┐    │    │
│  │  │Management│  │ Account │    │    │
│  │  │    UI    │  │ Signing │    │    │
│  │  └──────────┘  │  Keys   │    │    │
│  │                └─────────┘    │    │
│  └────────────────────────────────┘    │
└──────────────────┬─────────────────────┘
                   │ Leaf Node Connection
                   │ (TLS + JWT Auth)
┌──────────────────▼─────────────────────┐
│         Local Home Network              │
│  ┌─────────────────────────┐           │
│  │  NATS Server (Leaf)     │           │
│  │  - Runs automations     │           │
│  │  - Local device control │           │
│  └────────┬────────────────┘           │
│           │                             │
│   Each device has unique JWT creds     │
│  ┌────────▼────────┐ ┌─────────────┐   │
│  │ Device: Light-1 │ │Device: Sensor│  │
│  │ JWT: xxx...     │ │JWT: yyy...   │  │
│  └─────────────────┘ └──────────────┘  │
└─────────────────────────────────────────┘
```

## Security Implications

### Current Security Issues
1. **Shared Credentials**: All services use `home:changeme`
2. **No Device Isolation**: Any compromised device can access all subjects
3. **Plain Text Passwords**: No JWT/token-based auth
4. **No TLS**: WebSocket configured with `no_tls: true`
5. **Wide Permissions**: Services have broad publish/subscribe rights

### Target Security Model
1. **Per-Device JWTs**: Each device gets unique, revocable credentials
2. **Account Isolation**: Multiple homes separated by accounts
3. **Least Privilege**: Devices only access required subjects
4. **Signing Keys**: Easy credential generation without exposing account keys
5. **TLS Everything**: Encrypted connections throughout

## Migration Path

### Phase 1: Enable Synadia Cloud Connection
- Set up Synadia Cloud account
- Configure leaf node connection
- Keep local services running initially

### Phase 2: Implement JWT Authentication
- Generate account signing keys
- Create JWT library for device credential generation
- Update services to support JWT auth

### Phase 3: Per-Device Credentials
- Create credential provisioning service
- Generate unique JWTs per device
- Implement credential rotation

### Phase 4: Move Management to Cloud
- Deploy management UI to cloud
- Configure cloud-based KV stores
- Keep automations running locally

### Phase 5: Multi-Tenancy
- Implement account creation workflow
- Add user management
- Support multiple homes per deployment

## Required Changes

### 1. NATS Configuration
```conf
# Add to nats-server.conf
leafnodes {
  remotes = [
    {
      url: "tls://connect.ngs.global"
      credentials: "/path/to/leaf.creds"
    }
  ]
}

# Remove basic auth, add JWT resolver
authorization {
  account: $ACCOUNT_JWT
  resolver: {
    type: full
    dir: "/path/to/jwt/dir"
  }
}
```

### 2. Service Updates
- Add JWT authentication support
- Remove hardcoded credentials
- Implement credential refresh logic

### 3. Device Provisioning
- Create provisioning service
- Generate per-device JWTs
- Store device registry in cloud KV

### 4. Management UI Changes
- Deploy to cloud infrastructure
- Connect via NATS cloud account
- Remove local WebSocket server

## Benefits of Target Architecture

1. **Centralized Management**: Manage all homes from single interface
2. **Enhanced Security**: Per-device credentials, account isolation
3. **Scalability**: Easy to add new homes/users
4. **Reliability**: Cloud infrastructure with local fallback
5. **Updates**: Push updates from cloud without home access

## Recommendations

1. **Immediate**: Document the architectural vision clearly
2. **Short-term**: Start with Synadia Cloud connection
3. **Medium-term**: Implement JWT authentication
4. **Long-term**: Full cloud management with local execution

This divergence from the original vision has created a functional but less secure and scalable system. The migration path outlined above would align the implementation with the target architecture while maintaining functionality throughout the transition.