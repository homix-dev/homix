# Quick Start Guide

Get NATS Home Automation running in under 5 minutes!

## 🚀 One-Command Start

```bash
# Complete setup and start all services
task setup && task start
```

That's it! Services will be available at:
- **Management UI**: http://localhost:8081 (login: admin/admin)
- **Health Monitor**: http://localhost:8082
- **NATS Monitor**: http://localhost:8222

## 📋 Essential Commands

| Command | Description |
|---------|-------------|
| `task setup` | Install dependencies and setup project |
| `task start` | Start all services (NATS + UIs) |
| `task dev` | Development mode with tmux |
| `task up` | Start with Docker Compose |
| `task stop` | Stop all services |
| `task status` | Check service status |

## 🎛️ Start Options

### Native (Recommended for Development)
```bash
task start       # Start all services natively
task dev         # Start in tmux (easier to manage)
```

### Docker Compose
```bash
task up          # Basic services only
task up:full     # Include Home Assistant
```

### Manual Control
```bash
# Start just NATS
task infra:start-dev

# Then start services individually
cd services/discovery && go run main.go
cd services/health-monitor && go run main.go  
cd services/management-ui && go run main.go
```

## 🔧 Development Tips

- Use `task dev` for development - runs everything in tmux
- Use `task monitor` to watch NATS messages
- Use `task status` to check what's running
- Use `task logs` to see Docker Compose logs

## 🐛 Troubleshooting

### Services won't start
```bash
task stop        # Stop everything
task status      # Check what's still running
task start       # Try again
```

### Port conflicts
Default ports: 4222 (NATS), 8081 (Management UI), 8082 (Health Monitor), 8222 (NATS Monitor)

### Docker issues
```bash
# Use native mode instead
task start       # This uses native Go services

# Or check container tool
export CONTAINER_TOOL=podman  # or docker
task up
```

## 📚 Next Steps

1. **Add devices**: Visit Management UI → Devices → Add Device
2. **Create automations**: Management UI → Automations → Create  
3. **Monitor health**: Check Health Monitor at port 8082
4. **Explore CLI**: `task tools:cli:run --help`

For detailed documentation, see [COMPOSE_README.md](COMPOSE_README.md).