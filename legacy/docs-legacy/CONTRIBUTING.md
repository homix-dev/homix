# Contributing to NATS Home Automation

Thank you for your interest in contributing to the NATS Home Automation project! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/nats-home-automation.git
   cd nats-home-automation
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/originalrepo/nats-home-automation.git
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

1. **Install dependencies**:
   ```bash
   task setup-dev
   ```

2. **Run tests**:
   ```bash
   task test
   ```

3. **Start development environment**:
   ```bash
   task dev
   ```

## Development Guidelines

### Code Style

#### Go Code
- Follow standard Go formatting (`gofmt`)
- Use meaningful variable and function names
- Add comments for exported functions and types
- Keep functions focused and small
- Handle errors explicitly

```go
// Good example
func (s *Service) RegisterDevice(ctx context.Context, device Device) error {
    if device.ID == "" {
        return fmt.Errorf("device ID is required")
    }
    // Implementation...
}
```

#### Python Code
- Follow PEP 8 style guide
- Use type hints where applicable
- Document functions with docstrings
- Use Black for formatting

```python
# Good example
def publish_message(self, subject: str, data: dict) -> None:
    """Publish a message to NATS.
    
    Args:
        subject: NATS subject to publish to
        data: Message data as dictionary
    """
    # Implementation...
```

#### JavaScript Code
- Use ES6+ features
- Follow ESLint configuration
- Use JSDoc for documentation
- Prefer async/await over callbacks

```javascript
// Good example
/**
 * Send command to device
 * @param {string} deviceId - Device identifier
 * @param {object} command - Command data
 * @returns {Promise<void>}
 */
async function sendCommand(deviceId, command) {
    // Implementation...
}
```

### Testing

- Write unit tests for new functionality
- Maintain test coverage above 80%
- Use table-driven tests in Go
- Mock external dependencies
- Test error cases

Example Go test:
```go
func TestDeviceRegistration(t *testing.T) {
    tests := []struct {
        name    string
        device  Device
        wantErr bool
    }{
        {
            name:    "valid device",
            device:  Device{ID: "test-01", Type: "sensor"},
            wantErr: false,
        },
        {
            name:    "missing ID",
            device:  Device{Type: "sensor"},
            wantErr: true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := RegisterDevice(tt.device)
            if (err != nil) != tt.wantErr {
                t.Errorf("RegisterDevice() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

### Documentation

- Update README.md for user-facing changes
- Add/update API documentation for new endpoints
- Include code examples
- Document configuration options
- Update architecture diagrams if needed

### Commit Messages

Follow the conventional commits specification:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat(discovery): add device type auto-detection

Automatically detect device types based on capabilities
exposed in the device announcement message.

Closes #123
```

## Pull Request Process

1. **Update your fork**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Rebase your feature branch**:
   ```bash
   git checkout feature/your-feature-name
   git rebase main
   ```

3. **Run tests and linting**:
   ```bash
   task test
   task lint
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**:
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes you made and why
   - Include screenshots for UI changes
   - Ensure all CI checks pass

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated for changes
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventional commits
- [ ] PR description clearly explains changes
- [ ] All CI checks pass

## Project Structure

```
nats-home-automation/
├── services/          # Go microservices
├── bridges/           # Protocol bridges
├── tools/             # CLI and utilities
├── esphome-components/ # ESPHome components
├── ha-integration/    # Home Assistant integration
├── docs/              # Documentation
└── tests/             # Integration tests
```

## Adding New Features

### Adding a New Service

1. Create service directory:
   ```bash
   mkdir -p services/your-service
   ```

2. Use the standard structure:
   ```
   services/your-service/
   ├── cmd/
   │   └── main.go
   ├── internal/
   │   └── service/
   ├── config.yaml
   ├── Dockerfile
   ├── go.mod
   └── README.md
   ```

3. Add to services Taskfile
4. Document the service API

### Adding a New Bridge

1. Create bridge directory:
   ```bash
   mkdir -p bridges/protocol-nats
   ```

2. Implement the bridge interface
3. Add configuration
4. Document message mappings

## Testing Guidelines

### Unit Tests
- Test individual functions/methods
- Mock external dependencies
- Focus on edge cases
- Use table-driven tests

### Integration Tests
- Test component interactions
- Use real NATS server
- Test error scenarios
- Verify message flow

### Performance Tests
- Benchmark critical paths
- Monitor resource usage
- Test with realistic load

## Debugging Tips

1. **Enable debug logging**:
   ```yaml
   logging:
     level: debug
   ```

2. **Monitor NATS messages**:
   ```bash
   task monitor
   ```

3. **Check service logs**:
   ```bash
   docker logs <service-name>
   ```

4. **Use NATS CLI for testing**:
   ```bash
   nats pub home.test "test message"
   nats sub "home.>"
   ```

## Release Process

1. Update version numbers
2. Update CHANGELOG.md
3. Create release PR
4. Tag release after merge
5. Build and publish artifacts

## Getting Help

- Check existing [issues](https://github.com/yourusername/nats-home-automation/issues)
- Join our [discussions](https://github.com/yourusername/nats-home-automation/discussions)
- Read the [documentation](https://github.com/yourusername/nats-home-automation/tree/main/docs)

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to NATS Home Automation!