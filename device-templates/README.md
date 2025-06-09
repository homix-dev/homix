# NATS Home Automation Device Templates

This directory contains ready-to-use device templates for common IoT devices in the NATS Home Automation system. These templates provide standardized configurations, example implementations, and best practices for integrating various sensors, actuators, and smart devices.

## Table of Contents

- [Overview](#overview)
- [Template Structure](#template-structure)
- [Available Templates](#available-templates)
- [How to Use Templates](#how-to-use-templates)
- [Template Categories](#template-categories)
- [Creating Custom Templates](#creating-custom-templates)
- [Best Practices](#best-practices)
- [Contributing](#contributing)

## Overview

Device templates serve as blueprints for implementing devices in the NATS Home Automation ecosystem. Each template includes:

- Device metadata and capabilities
- NATS subject patterns and messaging formats
- Implementation examples for multiple platforms (ESPHome, Arduino, MicroPython)
- Wiring diagrams and hardware requirements
- Configuration options and defaults
- Integration with Home Assistant

## Template Structure

All templates follow a standardized YAML structure based on `base-template.yaml`:

```yaml
# Device Information
device_info:
  device_id: "${DEVICE_ID}"           # Unique identifier
  device_type: "sensor"               # sensor, switch, light, etc.
  name: "${DEVICE_NAME}"              # Human-readable name
  manufacturer: "${MANUFACTURER}"      # Device manufacturer
  model: "${MODEL}"                   # Device model
  hw_version: "${HW_VERSION}"         # Hardware version
  sw_version: "${SW_VERSION}"         # Software version
  location:
    room: "${ROOM}"                   # Room location
    area: "${AREA}"                   # Area/zone
    floor: "${FLOOR}"                 # Floor number

# Device Capabilities
capabilities:
  sensors: []                         # List of sensor types
  commands: []                        # Supported commands
  features: []                        # Additional features
  configurable: []                    # Configurable parameters

# NATS Configuration
nats:
  subjects:
    state: "home.devices.${device_type}.${device_id}.state"
    command: "home.devices.${device_type}.${device_id}.command"
    event: "home.devices.${device_type}.${device_id}.event"
    health: "home.devices.${device_type}.${device_id}.health"
    config: "home.config.device.${device_id}"

# State Reporting
state:
  intervals:
    normal: 60                        # Normal reporting interval (seconds)
    rapid: 5                          # Rapid reporting when changing
    health: 300                       # Health status interval

# Implementation Examples
esphome: {}                           # ESPHome configuration
arduino: {}                           # Arduino code example
micropython: {}                       # MicroPython implementation

# Home Assistant Integration
homeassistant: {}                     # HA discovery configuration
```

## Available Templates

### 🌡️ Sensors (`sensors/`)

| Template | Description | Measurements | Platforms |
|----------|-------------|--------------|-----------|
| `dht22-temperature-humidity.yaml` | DHT22 sensor | Temperature, Humidity | ESP32, ESP8266, Arduino |
| `bme280-environmental.yaml` | BME280 sensor | Temperature, Humidity, Pressure | ESP32, ESP8266 |
| `pir-motion-sensor.yaml` | PIR motion detector | Motion, Occupancy | All platforms |
| `water-leak-sensor.yaml` | Water leak detector | Leak status, Battery | ESP32, ESP8266 |
| `air-quality-sensor.yaml` | Air quality monitor | PM2.5, PM10, CO2, TVOC | ESP32 |

### 💡 Lights (`lights/`)

| Template | Description | Features | Platforms |
|----------|-------------|----------|-----------|
| `rgb-led-controller.yaml` | RGB LED strip controller | Color, Brightness, Effects | ESP32, ESP8266 |

### 🔌 Switches (`switches/`)

| Template | Description | Features | Platforms |
|----------|-------------|----------|-----------|
| `relay-switch.yaml` | Smart relay switch | On/Off, Timer, Power monitoring | ESP32, ESP8266, Arduino |

### 🌡️ Climate (`climate/`)

| Template | Description | Features | Platforms |
|----------|-------------|----------|-----------|
| `thermostat.yaml` | Smart thermostat | Heat/Cool, Schedule, Setpoints | ESP32 |

### 🔒 Security (`security/`)

| Template | Description | Features | Platforms |
|----------|-------------|----------|-----------|
| `door-window-sensor.yaml` | Magnetic contact sensor | Open/Closed, Tamper | ESP32, ESP8266 |
| `smart-lock.yaml` | Smart door lock | Lock/Unlock, Codes, Auto-lock | ESP32 |

### ⚡ Energy (`energy/`)

| Template | Description | Measurements | Platforms |
|----------|-------------|--------------|-----------|
| `power-monitor.yaml` | Power monitoring | Voltage, Current, Power, Energy | ESP32 |

## How to Use Templates

### 1. With ESPHome

Create a device configuration file that includes the template:

```yaml
# my-living-room-sensor.yaml
substitutions:
  device_id: "living-room-temp"
  device_name: "Living Room Temperature"
  room: "Living Room"
  area: "First Floor"

# Include the template
<<: !include templates/sensors/dht22-temperature-humidity.yaml

# Override any settings
sensor:
  - platform: dht
    pin: GPIO5  # Use different pin
```

### 2. With Arduino

Copy the example code from the template and customize:

```cpp
// Copy template code from arduino.example_code section
#include <NATSClient.h>
#include <DHT.h>

// Customize device settings
const char* deviceId = "bedroom-temp";
const char* deviceName = "Bedroom Temperature";

// Use template implementation
// ... rest of template code ...
```

### 3. With MicroPython

Import the template module or copy the implementation:

```python
# Import template module
from templates.sensors import DHT22Template

# Create device instance
sensor = DHT22Template(
    device_id="kitchen-temp",
    device_name="Kitchen Temperature",
    pin=4,
    nats_server="192.168.1.10"
)

# Start the sensor
sensor.start()
```

### 4. Variable Substitution

Templates use variable substitution for customization:

- `${DEVICE_ID}` - Unique device identifier
- `${DEVICE_NAME}` - Human-readable name
- `${ROOM}`, `${AREA}`, `${FLOOR}` - Location information
- `${WIFI_SSID}`, `${WIFI_PASSWORD}` - Network credentials
- `${NATS_SERVER}`, `${NATS_PORT}` - NATS connection

## Template Categories

### Base Template

`base-template.yaml` defines the standard structure that all device templates should follow. It includes:

- Device information schema
- NATS subject patterns
- Configuration options
- Health monitoring
- Power management
- Network settings

### Sensor Templates

Sensor templates include:
- Data types and units
- Sampling intervals
- Calibration options
- Filtering and smoothing
- Alert thresholds

### Actuator Templates

Actuator templates (switches, lights, etc.) include:
- Command handling
- State feedback
- Physical button integration
- Timer and scheduling
- Safety features

### Complex Device Templates

Templates for devices with multiple functions:
- Climate control devices
- Security systems
- Energy monitors
- Multi-sensor units

## Creating Custom Templates

To create a new device template:

1. **Start with the base template**
   ```bash
   cp base-template.yaml my-device.yaml
   ```

2. **Define device information**
   ```yaml
   device_info:
     device_type: "sensor"  # or switch, light, etc.
     manufacturer: "Acme Corp"
     model: "AS-100"
   ```

3. **Specify capabilities**
   ```yaml
   capabilities:
     sensors: ["temperature", "humidity"]
     units:
       temperature: "°C"
       humidity: "%"
   ```

4. **Add implementation examples**
   ```yaml
   esphome:
     sensor:
       - platform: custom
         # ... implementation ...
   
   arduino:
     required_libraries:
       - "SensorLibrary"
     example_code: |
       // Arduino implementation
   ```

5. **Include wiring information**
   ```yaml
   wiring:
     esp32:
       vcc: "3.3V"
       gnd: "GND"
       data: "GPIO4"
   ```

6. **Document configuration options**
   ```yaml
   configuration:
     defaults:
       update_interval: 60
       calibration_offset: 0.0
   ```

## Best Practices

### 1. Device Naming

- Use descriptive, unique device IDs: `living-room-temp-01`
- Include location in device names: `"Living Room Temperature Sensor"`
- Follow consistent naming patterns across your system

### 2. NATS Subjects

- Follow the standard subject hierarchy: `home.devices.{type}.{id}.{action}`
- Use appropriate subject for each message type:
  - `.state` - Current device state
  - `.command` - Control commands
  - `.event` - State changes and alerts
  - `.health` - Device health metrics

### 3. State Reporting

- Report complete state in each message
- Include timestamps for synchronization
- Use appropriate reporting intervals:
  - Normal: 30-60 seconds for stable values
  - Rapid: 1-5 seconds during changes
  - Health: 5-10 minutes for diagnostics

### 4. Error Handling

- Implement retry logic for failed publishes
- Validate sensor readings before publishing
- Report errors through health topics
- Gracefully handle network disconnections

### 5. Power Management

- Use deep sleep for battery-powered devices
- Implement wake-on-event where possible
- Monitor battery levels and report low battery
- Consider solar power for outdoor devices

### 6. Security

- Use TLS for NATS connections
- Implement device authentication
- Validate all incoming commands
- Sanitize configuration inputs
- Never hardcode credentials

### 7. Testing

- Test with actual hardware before deployment
- Verify all NATS subjects work correctly
- Test error conditions and recovery
- Monitor long-term stability
- Document any hardware-specific quirks

## Contributing

To contribute a new device template:

1. **Create the template file** in the appropriate category folder
2. **Follow the standard structure** defined in `base-template.yaml`
3. **Include complete examples** for at least one platform
4. **Add comprehensive documentation** including:
   - Device description and use cases
   - Hardware requirements and compatibility
   - Wiring diagrams or connection notes
   - Configuration options and their effects
   - Known issues or limitations

5. **Test thoroughly** with real hardware
6. **Submit a pull request** with:
   - The new template file
   - Updated README if adding a new category
   - Example output/logs showing it works
   - Photos of working implementation (optional)

### Template Requirements

- Must follow the standard YAML structure
- Include at least one working implementation example
- Document all configuration options
- Specify hardware requirements clearly
- Include safety warnings where appropriate
- Use consistent formatting and style

### Review Process

Templates will be reviewed for:
- Completeness and accuracy
- Code quality and best practices
- Security considerations
- Documentation clarity
- Hardware compatibility claims

## Support

For questions or issues with templates:

1. Check the template's notes section for known issues
2. Review the example implementations carefully
3. Consult the main project documentation
4. Open an issue on GitHub with:
   - Template name and version
   - Hardware platform and specifications
   - Error messages or unexpected behavior
   - Your implementation code

## License

All templates are provided under the same license as the main NATS Home Automation project. See the project root for license details.