/*
  NATS Temperature Sensor Example
  
  This example shows how to create a temperature sensor device that:
  - Announces itself to the NATS discovery service
  - Publishes temperature readings periodically
  - Responds to configuration commands
  - Reports device health status
  
  Hardware:
  - ESP32 or ESP8266
  - DHT22 temperature/humidity sensor (connected to pin 4)
  
  Libraries required:
  - NATSClient
  - DHT sensor library by Adafruit
*/

#include <NATSClient.h>
#include <DHT.h>

#ifdef ESP32
  #include <WiFi.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
#endif

// WiFi credentials
const char* ssid = "your-ssid";
const char* password = "your-password";

// NATS server details
const char* natsServer = "192.168.1.100";
const int natsPort = 4222;
const char* natsUser = "home";
const char* natsPass = "changeme";

// Device information
const char* deviceId = "temp-sensor-01";
const char* deviceType = "sensor";
const char* deviceName = "Living Room Temperature";

// DHT sensor
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// NATS client
NATSClient nats;

// Timing
unsigned long lastReading = 0;
unsigned long lastHealthReport = 0;
unsigned long readingInterval = 30000;  // 30 seconds default
bool enabled = true;

// Calibration
float tempOffset = 0.0;
float humidityOffset = 0.0;

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    delay(10);
  }
  
  Serial.println("NATS Temperature Sensor");
  Serial.println("======================");
  
  // Initialize DHT sensor
  dht.begin();
  
  // Connect to WiFi
  connectWiFi();
  
  // Configure NATS client
  nats.setVerbose(false);
  nats.setClientID(deviceId);
  
  // Set device info for auto-discovery
  nats.setDeviceInfo(deviceId, deviceType, deviceName);
  nats.enableAutoDiscovery(true);
  
  // Connect to NATS
  Serial.print("Connecting to NATS...");
  if (nats.connect(natsServer, natsPort, natsUser, natsPass)) {
    Serial.println(" connected!");
  } else {
    Serial.print(" failed: ");
    Serial.println(nats.getLastError());
    while (1) {
      delay(1000);
    }
  }
  
  // Subscribe to configuration commands
  setupSubscriptions();
  
  // Announce device capabilities
  announceCapabilities();
  
  Serial.println("Setup complete!");
}

void loop() {
  // Process NATS messages
  nats.loop();
  
  // Read and publish sensor data
  if (enabled && millis() - lastReading > readingInterval) {
    lastReading = millis();
    publishSensorData();
  }
  
  // Publish health status
  if (millis() - lastHealthReport > 60000) {  // Every minute
    lastHealthReport = millis();
    publishHealthStatus();
  }
}

void setupSubscriptions() {
  // Subscribe to device commands
  char cmdTopic[128];
  sprintf(cmdTopic, "home.devices.%s.%s.command", deviceType, deviceId);
  
  nats.subscribe(cmdTopic, [](const char* subject, const char* data, const char* reply) {
    handleCommand(data, reply);
  });
  
  // Subscribe to configuration updates
  char configTopic[128];
  sprintf(configTopic, "home.config.device.%s", deviceId);
  
  nats.subscribe(configTopic, [](const char* subject, const char* data, const char* reply) {
    handleConfiguration(data);
  });
}

void handleCommand(const char* command, const char* reply) {
  Serial.print("Command received: ");
  Serial.println(command);
  
  // Parse JSON command (simplified - in production use ArduinoJson)
  if (strstr(command, "\"action\":\"read\"")) {
    // Force immediate reading
    publishSensorData();
    if (reply) {
      nats.publish(reply, "{\"status\":\"ok\"}");
    }
  } else if (strstr(command, "\"action\":\"enable\"")) {
    enabled = true;
    if (reply) {
      nats.publish(reply, "{\"status\":\"enabled\"}");
    }
  } else if (strstr(command, "\"action\":\"disable\"")) {
    enabled = false;
    if (reply) {
      nats.publish(reply, "{\"status\":\"disabled\"}");
    }
  } else if (strstr(command, "\"action\":\"restart\"")) {
    if (reply) {
      nats.publish(reply, "{\"status\":\"restarting\"}");
    }
    delay(100);
    ESP.restart();
  }
}

void handleConfiguration(const char* config) {
  Serial.print("Configuration received: ");
  Serial.println(config);
  
  // Parse configuration (simplified - in production use ArduinoJson)
  char* ptr;
  
  // Update reading interval
  ptr = strstr(config, "\"update_interval\":");
  if (ptr) {
    int interval = atoi(ptr + 18);
    if (interval >= 10 && interval <= 3600) {
      readingInterval = interval * 1000;
      Serial.print("Update interval set to: ");
      Serial.println(interval);
    }
  }
  
  // Update temperature offset
  ptr = strstr(config, "\"temp_offset\":");
  if (ptr) {
    tempOffset = atof(ptr + 14);
    Serial.print("Temperature offset set to: ");
    Serial.println(tempOffset);
  }
  
  // Update humidity offset
  ptr = strstr(config, "\"humidity_offset\":");
  if (ptr) {
    humidityOffset = atof(ptr + 18);
    Serial.print("Humidity offset set to: ");
    Serial.println(humidityOffset);
  }
}

void publishSensorData() {
  // Read sensor
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  
  // Check if readings are valid
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  
  // Apply calibration
  temperature += tempOffset;
  humidity += humidityOffset;
  
  // Create JSON payload
  char payload[256];
  sprintf(payload, 
    "{\"device_id\":\"%s\","
    "\"timestamp\":%lu,"
    "\"data\":{"
      "\"temperature\":%.1f,"
      "\"humidity\":%.1f"
    "}}",
    deviceId,
    millis() / 1000,
    temperature,
    humidity
  );
  
  // Publish to state topic
  char topic[128];
  sprintf(topic, "home.devices.%s.%s.state", deviceType, deviceId);
  
  if (nats.publish(topic, payload)) {
    Serial.print("Published: ");
    Serial.println(payload);
  }
}

void publishHealthStatus() {
  char payload[256];
  sprintf(payload,
    "{\"device_id\":\"%s\","
    "\"online\":true,"
    "\"enabled\":%s,"
    "\"uptime\":%lu,"
    "\"free_heap\":%d,"
    "\"rssi\":%d,"
    "\"ip\":\"%s\"}",
    deviceId,
    enabled ? "true" : "false",
    millis() / 1000,
    ESP.getFreeHeap(),
    WiFi.RSSI(),
    WiFi.localIP().toString().c_str()
  );
  
  char topic[128];
  sprintf(topic, "home.devices.%s.%s.health", deviceType, deviceId);
  nats.publish(topic, payload);
}

void announceCapabilities() {
  const char* capabilities = 
    "{\"device_id\":\"%s\","
    "\"device_type\":\"sensor\","
    "\"name\":\"%s\","
    "\"manufacturer\":\"DIY\","
    "\"model\":\"ESP-DHT22\","
    "\"capabilities\":{"
      "\"sensors\":[\"temperature\",\"humidity\"],"
      "\"units\":{\"temperature\":\"°C\",\"humidity\":\"%%\"},"
      "\"configurable\":[\"update_interval\",\"temp_offset\",\"humidity_offset\"],"
      "\"commands\":[\"read\",\"enable\",\"disable\",\"restart\"]"
    "}}";
  
  char payload[512];
  sprintf(payload, capabilities, deviceId, deviceName);
  
  nats.publish("home.discovery.announce", payload);
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.print("Connected! IP: ");
  Serial.println(WiFi.localIP());
}