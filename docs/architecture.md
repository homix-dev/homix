# NATS Home Automation Architecture

This document describes the technical architecture of the NATS-based home automation system.

## System Overview

The NATS Home Automation system is built on a microservices architecture with NATS as the central messaging backbone. This design provides:

- **Decoupled components** that can be developed and deployed independently
- **Real-time communication** with sub-millisecond latency
- **Resilient operation** with automatic failover and reconnection
- **Scalable architecture** supporting thousands of devices

## Core Components

### 1. NATS Infrastructure

The messaging backbone consists of:

- **Local NATS Server**: Runs on-premises for low-latency local communication
- **Synadia Cloud Connection**: Optional cloud connectivity via leaf nodes
- **JetStream**: Provides message persistence and at-least-once delivery
- **Key-Value Store**: Distributed configuration management

### 2. Device Layer

#### ESPHome Devices
- Custom NATS client components for ESP32/ESP8266
- Native NATS protocol support
- Automatic device announcement on boot
- Resilient connection handling

#### Legacy Devices
- Connected via protocol bridges
- Maintains compatibility with existing ecosystems
- Transparent NATS integration

### 3. Service Layer

#### Discovery Service
- Listens on `home.discovery.announce`
- Maintains device registry in KV store
- Publishes device availability events

#### Configuration Service
- Manages device configurations via KV store
- Handles configuration updates and rollbacks
- Provides versioned configuration history

#### Automation Engine
- Subscribes to device events
- Executes automation rules
- Publishes commands to devices

### 4. Integration Layer

#### Home Assistant Bridge
- Custom integration component
- Bidirectional message translation
- Entity mapping and state synchronization
- WebSocket API support

#### Protocol Bridges
- MQTT to NATS bridge
- Zigbee2MQTT adapter
- Z-Wave JS integration
- Generic HTTP/REST bridge

## Message Flow

### Device State Updates
```
Device → NATS Subject → JetStream → Subscribers
         home.devices.sensor.temp01.state
```

### Command Execution
```
HA/Client → Request → NATS → Device → Reply
            home.devices.switch.light01.set
```

### Device Discovery
```
Device → Announce → Discovery Service → Registry → Subscribers
         home.discovery.announce
```

## Subject Hierarchy

```
home.
├── devices.
│   ├── {type}.
│   │   └── {id}.
│   │       ├── state      # Current state
│   │       ├── set        # Commands
│   │       ├── config     # Configuration
│   │       └── health     # Health metrics
├── discovery.
│   ├── announce           # New device announcements
│   └── remove            # Device removal
├── events.
│   ├── state_changed     # State change events
│   ├── automation        # Automation triggers
│   └── system           # System events
└── config.
    └── {entity_type}.
        └── {id}          # Configuration data
```

## Data Persistence

### JetStream Streams
- **Device States**: Retains latest state for each device
- **Command History**: Audit trail of all commands
- **Event Stream**: Time-series event data

### KV Buckets
- **Device Registry**: Device metadata and capabilities
- **Configurations**: Device and system configurations
- **Automation Rules**: Rule definitions and state

## Resilience Patterns

### Connection Management
- Automatic reconnection with exponential backoff
- Connection pooling for high-throughput scenarios
- Health checks and circuit breakers

### Message Delivery
- At-least-once delivery for critical messages
- Request-reply timeout handling
- Dead letter queues for failed messages

### Failover Strategy
- Local operation during cloud disconnection
- Message buffering in JetStream
- Automatic synchronization on reconnection

## Security Model

### Authentication
- TLS encryption for all connections
- User/password or token-based auth
- Per-device credentials

### Authorization
- Subject-based permissions
- Role-based access control
- Device-specific publish/subscribe rights

## Performance Considerations

### Latency Optimization
- Direct subject routing (no broker overhead)
- Connection reuse
- Local caching of frequently accessed data

### Throughput Scaling
- Horizontal scaling via NATS clustering
- Load distribution across leaf nodes
- Efficient binary protocol

### Resource Usage
- Minimal memory footprint (~20MB)
- Low CPU usage
- Efficient network utilization

## Deployment Options

### Single Node
- Suitable for most home installations
- All components on single server
- Simple configuration

### Distributed
- Separate NATS server
- Microservices on different hosts
- Better isolation and scaling

### High Availability
- NATS clustering
- Service redundancy
- Automatic failover

## Integration Points

### Home Assistant
- WebSocket API for real-time updates
- REST API for device control
- Entity registry integration
- Service call translation

### External Services
- Webhook endpoints
- REST API gateway
- GraphQL interface (future)
- Time-series database export