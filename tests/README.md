# NATS Home Automation Tests

Comprehensive test suite for the NATS Home Automation system, including unit tests, integration tests, and performance benchmarks.

## Test Structure

```
tests/
├── integration/          # End-to-end integration tests
│   └── test_end_to_end.py
├── requirements-test.txt # Python test dependencies
├── Taskfile.yaml        # Test automation tasks
└── README.md            # This file
```

Component-specific tests are located within each component:
- `services/discovery/internal/service/service_test.go`
- `bridges/mqtt-nats/internal/bridge/bridge_test.go`
- `tools/nats-ha-cli/cmd/devices_test.go`
- `ha-integration/tests/` - Home Assistant integration tests
- `arduino-nats-client/test/` - Arduino library tests

## Running Tests

### Quick Start

Run all tests:
```bash
task test
```

Run specific test types:
```bash
task test:unit        # Unit tests only
task test:integration # Integration tests (requires NATS)
task test:watch      # Watch mode
```

### Prerequisites

1. **NATS Server**: Integration tests require a running NATS server
   ```bash
   task infra:start-dev
   ```

2. **Test Dependencies**:
   ```bash
   cd tests
   pip install -r requirements-test.txt
   ```

3. **Go Test Dependencies**:
   ```bash
   go install github.com/stretchr/testify/...
   ```

## Test Categories

### Unit Tests

Unit tests verify individual components in isolation:

#### Go Tests
- **Discovery Service**: Device registration, KV storage, announcement handling
- **MQTT-NATS Bridge**: Message routing, topic mapping, transformations
- **CLI Tool**: Command parsing, output formatting, error handling

Run Go unit tests:
```bash
task test:unit:go
```

#### Python Tests
- **Home Assistant Integration**: Config flow, entity creation, service calls
- **Sensor Platform**: State updates, device attributes, availability

Run Python unit tests:
```bash
task test:unit:python
```

### Integration Tests

Integration tests verify complete workflows:

- **Device Discovery**: End-to-end device announcement and registration
- **Device Control**: Command/response patterns, state updates
- **Configuration Management**: KV store operations, config updates
- **Protocol Bridging**: MQTT to NATS message flow

Run integration tests:
```bash
task test:integration
```

### Infrastructure Tests

Test NATS server configurations:
```bash
task test:integration:infra MODE=dev  # Test dev setup
task test:integration:infra MODE=prod # Test production setup
```

## Writing Tests

### Go Tests

Use testify for assertions:
```go
func TestDeviceValidation(t *testing.T) {
    device := models.Device{
        ID:   "test-01",
        Type: "sensor",
        Name: "Test Sensor",
    }
    
    err := device.Validate()
    assert.NoError(t, err)
}
```

### Python Tests

Use pytest for testing:
```python
@pytest.mark.asyncio
async def test_device_discovery(nats_client):
    device = {
        "device_id": "test-01",
        "device_type": "sensor",
        "name": "Test Sensor"
    }
    
    await nats_client.publish("home.discovery.announce", 
                             json.dumps(device).encode())
    
    # Verify device was registered
    response = await nats_client.request("home.discovery.get", 
                                       json.dumps({"device_id": "test-01"}).encode())
    assert response is not None
```

### Mocking

#### Go Mocking
```go
type MockNATSConn struct {
    mock.Mock
}

func (m *MockNATSConn) Publish(subject string, data []byte) error {
    args := m.Called(subject, data)
    return args.Error(0)
}
```

#### Python Mocking
```python
@patch("nats.connect")
async def test_connection(mock_connect):
    mock_conn = AsyncMock()
    mock_connect.return_value = mock_conn
    
    client = NATSClient()
    await client.connect()
    
    mock_connect.assert_called_once()
```

## Test Coverage

Generate coverage reports:
```bash
task test:coverage
```

View coverage:
- Go: `coverage.html`
- Python: `htmlcov/index.html`

## CI/CD Integration

For CI environments:
```bash
task test:ci
```

This runs:
1. Linting
2. Unit tests
3. Integration tests
4. Coverage report generation

## Performance Testing

Run benchmarks:
```bash
task test:benchmark
```

Example benchmark:
```go
func BenchmarkDeviceRegistration(b *testing.B) {
    svc := setupService()
    device := createTestDevice()
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        svc.RegisterDevice(context.Background(), device)
    }
}
```

## Debugging Tests

Enable verbose output:
```bash
task test -- -v
```

Run specific test:
```bash
# Go
go test -run TestDeviceDiscovery ./...

# Python
pytest -k test_sensor_temperature -v
```

## Test Data

Test fixtures are included for:
- Device definitions
- MQTT messages
- NATS subjects
- Home Assistant entities

Example test data:
```json
{
  "device_id": "test-sensor-01",
  "device_type": "sensor",
  "name": "Test Temperature Sensor",
  "capabilities": {
    "sensors": ["temperature", "humidity"],
    "units": {"temperature": "°C", "humidity": "%"}
  }
}
```

## Troubleshooting

### NATS Connection Failed
```bash
# Check NATS is running
nats ping

# Start NATS if needed
task infra:start-dev
```

### Missing Dependencies
```bash
# Install all test dependencies
task test:setup
```

### Test Timeouts
Increase timeout for slow tests:
```python
@pytest.mark.timeout(30)
async def test_slow_operation():
    # test code
```

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure all tests pass
3. Maintain >80% coverage
4. Add integration tests for workflows
5. Document test scenarios