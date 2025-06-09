# Arduino NATS Client Library

A lightweight NATS client library for Arduino, ESP8266, and ESP32 boards, designed for IoT and home automation applications.

## Features

- **Lightweight**: Optimized for microcontrollers with limited resources
- **Cross-platform**: Works with ESP32, ESP8266, and Arduino boards with Ethernet/WiFi
- **Auto-reconnect**: Automatically reconnects to NATS server on connection loss
- **Device Discovery**: Built-in support for NATS home automation discovery protocol
- **Simple API**: Easy-to-use publish/subscribe interface
- **Request/Reply**: Support for request-reply pattern
- **Authentication**: Supports username/password and token authentication

## Installation

### Arduino Library Manager

1. Open Arduino IDE
2. Go to Sketch → Include Library → Manage Libraries
3. Search for "NATS Client"
4. Click Install

### Manual Installation

1. Download the library as a ZIP file
2. In Arduino IDE: Sketch → Include Library → Add .ZIP Library
3. Select the downloaded file

### PlatformIO

Add to your `platformio.ini`:
```ini
lib_deps = 
    https://github.com/yourusername/nats-home-automation/tree/main/arduino-nats-client
```

## Quick Start

```cpp
#include <NATSClient.h>

NATSClient nats;

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi first (ESP boards)
  WiFi.begin("ssid", "password");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  
  // Connect to NATS
  if (nats.connect("192.168.1.100", 4222, "user", "pass")) {
    Serial.println("Connected to NATS!");
  }
  
  // Subscribe to a topic
  nats.subscribe("test.topic", [](const char* subject, const char* data, const char* reply) {
    Serial.print("Received: ");
    Serial.println(data);
  });
}

void loop() {
  // Must call this regularly
  nats.loop();
  
  // Publish a message every 5 seconds
  static unsigned long last = 0;
  if (millis() - last > 5000) {
    last = millis();
    nats.publish("test.topic", "Hello NATS!");
  }
}
```

## API Reference

### Connection

#### `bool connect(const char* server, uint16_t port = 4222)`
Connect to NATS server without authentication.

#### `bool connect(const char* server, uint16_t port, const char* user, const char* pass)`
Connect with username/password authentication.

#### `bool connect(const char* server, uint16_t port, const char* token)`
Connect with token authentication.

#### `void disconnect()`
Disconnect from NATS server.

#### `bool connected()`
Check if connected to NATS server.

#### `void loop()`
Process NATS messages. Must be called regularly in your main loop.

### Publishing

#### `bool publish(const char* subject, const char* data)`
Publish a string message.

#### `bool publish(const char* subject, const uint8_t* data, size_t size)`
Publish binary data.

### Subscribing

#### `bool subscribe(const char* subject, MessageHandler handler)`
Subscribe to a subject. The handler is called when messages are received.

```cpp
nats.subscribe("my.topic", [](const char* subject, const char* data, const char* reply) {
  // Handle message
});
```

#### `bool unsubscribe(const char* subject)`
Unsubscribe from a subject.

### Request/Reply

#### `bool request(const char* subject, const char* data, MessageHandler handler, unsigned long timeout = 5000)`
Send a request and wait for a reply.

```cpp
nats.request("time.service", "", [](const char* subject, const char* data, const char* reply) {
  Serial.print("Current time: ");
  Serial.println(data);
}, 5000);
```

### Device Discovery

#### `void setDeviceInfo(const char* deviceId, const char* deviceType, const char* deviceName)`
Set device information for auto-discovery.

#### `void enableAutoDiscovery(bool enable = true)`
Enable/disable automatic device announcement.

#### `void announceDevice()`
Manually announce device to discovery service.

### Configuration

#### `void setClientID(const char* clientId)`
Set client identifier.

#### `void setReconnect(bool enable)`
Enable/disable auto-reconnect.

#### `void setPingInterval(unsigned long interval)`
Set PING interval in milliseconds.

#### `void setVerbose(bool verbose)`
Enable/disable debug output.

### Callbacks

#### `void onConnect(ConnectionHandler handler)`
Set callback for connection events.

#### `void onDisconnect(ConnectionHandler handler)`
Set callback for disconnection events.

## Examples

### Temperature Sensor

See [examples/TemperatureSensor](examples/TemperatureSensor/TemperatureSensor.ino) for a complete temperature sensor implementation with:
- DHT22 sensor support
- Automatic device discovery
- Configuration management
- Health monitoring

### Smart Switch

See [examples/SmartSwitch](examples/SmartSwitch/SmartSwitch.ino) for a smart switch implementation with:
- Relay control
- Physical button support
- Timer functionality
- State reporting

### Basic Pub/Sub

See [examples/BasicPubSub](examples/BasicPubSub/BasicPubSub.ino) for basic publish/subscribe operations.

## Home Automation Integration

This library is designed to work with the NATS Home Automation system. Devices using this library can:

1. **Auto-discover**: Announce themselves to the discovery service
2. **Report state**: Publish sensor readings and device states
3. **Receive commands**: Subscribe to command topics for remote control
4. **Configuration**: Support remote configuration updates
5. **Health monitoring**: Report device health and statistics

### Subject Convention

The library follows the NATS home automation subject hierarchy:

- `home.devices.{type}.{id}.state` - Device state updates
- `home.devices.{type}.{id}.command` - Device commands
- `home.devices.{type}.{id}.event` - Device events
- `home.devices.{type}.{id}.health` - Health status
- `home.discovery.announce` - Device announcements
- `home.config.device.{id}` - Device configuration

## Hardware Support

### ESP32
- Full support for WiFi connectivity
- Tested on ESP32-DevKitC, ESP32-S2, ESP32-C3

### ESP8266
- Full support for WiFi connectivity
- Tested on NodeMCU, Wemos D1 Mini

### Arduino
- Requires Ethernet shield (W5100, W5500)
- Tested on Arduino Uno, Mega 2560

## Memory Usage

Typical memory usage:
- Flash: ~30KB
- RAM: ~4KB (plus buffers)

Buffer sizes can be adjusted in `NATSClient.h`:
```cpp
#define NATS_MAX_SUBJECT_LENGTH 256
#define NATS_MAX_PAYLOAD_SIZE 1024
```

## Limitations

- Maximum payload size: 1024 bytes (configurable)
- Maximum subscriptions: 10 (configurable)
- No TLS support (use NATS leaf nodes for secure connections)
- Simple JSON parsing (use ArduinoJson for complex parsing)

## Troubleshooting

### Connection Issues
- Verify NATS server is running and accessible
- Check firewall rules for port 4222
- Ensure WiFi/Ethernet is connected before NATS connection

### Message Not Received
- Verify subscription subject matches exactly
- Check that `nats.loop()` is called regularly
- Enable verbose mode for debugging

### Memory Issues
- Reduce buffer sizes if running low on RAM
- Limit number of subscriptions
- Use shorter subject names

## Contributing

Contributions are welcome! Please submit pull requests or issues on GitHub.

## License

This library is part of the NATS Home Automation project and is licensed under the MIT License.