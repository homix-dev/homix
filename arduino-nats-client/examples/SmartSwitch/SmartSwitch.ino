/*
  NATS Smart Switch Example
  
  This example creates a smart switch that:
  - Controls a relay connected to pin 5
  - Reports switch state changes
  - Responds to on/off commands
  - Supports toggle and timer functions
  - Integrates with Home Assistant via NATS
  
  Hardware:
  - ESP32 or ESP8266
  - Relay module connected to pin 5
  - Physical button connected to pin 0 (optional)
*/

#include <NATSClient.h>

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
const char* deviceId = "switch-01";
const char* deviceType = "switch";
const char* deviceName = "Living Room Light";

// Hardware pins
const int RELAY_PIN = 5;
const int BUTTON_PIN = 0;  // Boot button on most ESP boards

// NATS client
NATSClient nats;

// Switch state
bool switchState = false;
bool lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 50;

// Timer functionality
bool timerActive = false;
unsigned long timerStart = 0;
unsigned long timerDuration = 0;

// Statistics
unsigned long switchCount = 0;
unsigned long lastStateChange = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    delay(10);
  }
  
  Serial.println("NATS Smart Switch");
  Serial.println("=================");
  
  // Initialize hardware
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  digitalWrite(RELAY_PIN, LOW);
  
  // Connect to WiFi
  connectWiFi();
  
  // Configure NATS client
  nats.setVerbose(false);
  nats.setClientID(deviceId);
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
  
  // Subscribe to commands
  setupSubscriptions();
  
  // Announce device
  announceDevice();
  
  // Publish initial state
  publishState();
  
  Serial.println("Setup complete!");
}

void loop() {
  // Process NATS messages
  nats.loop();
  
  // Check physical button
  checkButton();
  
  // Check timer
  if (timerActive && millis() - timerStart >= timerDuration) {
    timerActive = false;
    setSwitchState(false);
    Serial.println("Timer expired, turning off");
  }
  
  // Publish health status periodically
  static unsigned long lastHealth = 0;
  if (millis() - lastHealth > 60000) {
    lastHealth = millis();
    publishHealth();
  }
}

void setupSubscriptions() {
  // Subscribe to commands
  char cmdTopic[128];
  sprintf(cmdTopic, "home.devices.%s.%s.command", deviceType, deviceId);
  
  nats.subscribe(cmdTopic, [](const char* subject, const char* data, const char* reply) {
    handleCommand(data, reply);
  });
  
  // Subscribe to configuration
  char configTopic[128];
  sprintf(configTopic, "home.config.device.%s", deviceId);
  
  nats.subscribe(configTopic, [](const char* subject, const char* data, const char* reply) {
    handleConfiguration(data);
  });
}

void handleCommand(const char* command, const char* reply) {
  Serial.print("Command: ");
  Serial.println(command);
  
  // Parse command (simplified JSON parsing)
  bool success = false;
  char response[128];
  
  if (strstr(command, "\"action\":\"on\"")) {
    setSwitchState(true);
    success = true;
    strcpy(response, "{\"status\":\"on\"}");
  } 
  else if (strstr(command, "\"action\":\"off\"")) {
    setSwitchState(false);
    success = true;
    strcpy(response, "{\"status\":\"off\"}");
  } 
  else if (strstr(command, "\"action\":\"toggle\"")) {
    setSwitchState(!switchState);
    success = true;
    sprintf(response, "{\"status\":\"%s\"}", switchState ? "on" : "off");
  }
  else if (strstr(command, "\"action\":\"timer\"")) {
    // Extract duration (simplified)
    char* ptr = strstr(command, "\"duration\":");
    if (ptr) {
      int seconds = atoi(ptr + 11);
      if (seconds > 0 && seconds <= 3600) {  // Max 1 hour
        setSwitchState(true);
        timerActive = true;
        timerStart = millis();
        timerDuration = seconds * 1000;
        success = true;
        sprintf(response, "{\"status\":\"timer_set\",\"duration\":%d}", seconds);
      }
    }
  }
  else if (strstr(command, "\"action\":\"status\"")) {
    sprintf(response, "{\"state\":\"%s\",\"timer_active\":%s}", 
            switchState ? "on" : "off",
            timerActive ? "true" : "false");
    success = true;
  }
  
  // Send reply if requested
  if (reply && success) {
    nats.publish(reply, response);
  }
}

void handleConfiguration(const char* config) {
  Serial.print("Configuration: ");
  Serial.println(config);
  
  // Parse and apply configuration
  // In a real implementation, use ArduinoJson for proper parsing
}

void setSwitchState(bool state) {
  if (state != switchState) {
    switchState = state;
    digitalWrite(RELAY_PIN, state ? HIGH : LOW);
    switchCount++;
    lastStateChange = millis();
    
    Serial.print("Switch turned ");
    Serial.println(state ? "ON" : "OFF");
    
    // Cancel timer if manually turned off
    if (!state && timerActive) {
      timerActive = false;
    }
    
    publishState();
    publishEvent(state ? "switched_on" : "switched_off");
  }
}

void checkButton() {
  int reading = digitalRead(BUTTON_PIN);
  
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }
  
  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading == LOW && lastButtonState == HIGH) {
      // Button pressed
      setSwitchState(!switchState);
    }
  }
  
  lastButtonState = reading;
}

void publishState() {
  char payload[256];
  sprintf(payload,
    "{\"device_id\":\"%s\","
    "\"state\":\"%s\","
    "\"timer_active\":%s,"
    "\"timer_remaining\":%lu,"
    "\"switch_count\":%lu,"
    "\"last_change\":%lu}",
    deviceId,
    switchState ? "on" : "off",
    timerActive ? "true" : "false",
    timerActive ? (timerDuration - (millis() - timerStart)) / 1000 : 0,
    switchCount,
    lastStateChange / 1000
  );
  
  char topic[128];
  sprintf(topic, "home.devices.%s.%s.state", deviceType, deviceId);
  nats.publish(topic, payload);
}

void publishEvent(const char* event) {
  char payload[256];
  sprintf(payload,
    "{\"device_id\":\"%s\","
    "\"event\":\"%s\","
    "\"timestamp\":%lu}",
    deviceId,
    event,
    millis() / 1000
  );
  
  char topic[128];
  sprintf(topic, "home.devices.%s.%s.event", deviceType, deviceId);
  nats.publish(topic, payload);
}

void publishHealth() {
  char payload[256];
  sprintf(payload,
    "{\"device_id\":\"%s\","
    "\"online\":true,"
    "\"uptime\":%lu,"
    "\"free_heap\":%d,"
    "\"rssi\":%d,"
    "\"switch_count\":%lu}",
    deviceId,
    millis() / 1000,
    ESP.getFreeHeap(),
    WiFi.RSSI(),
    switchCount
  );
  
  char topic[128];
  sprintf(topic, "home.devices.%s.%s.health", deviceType, deviceId);
  nats.publish(topic, payload);
}

void announceDevice() {
  char payload[512];
  sprintf(payload,
    "{\"device_id\":\"%s\","
    "\"device_type\":\"switch\","
    "\"name\":\"%s\","
    "\"manufacturer\":\"DIY\","
    "\"model\":\"ESP-Relay\","
    "\"capabilities\":{"
      "\"commands\":[\"on\",\"off\",\"toggle\",\"timer\",\"status\"],"
      "\"features\":[\"timer\",\"physical_button\"],"
      "\"max_timer\":3600"
    "}}",
    deviceId,
    deviceName
  );
  
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