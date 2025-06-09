/*
  Basic NATS Publish/Subscribe Example
  
  This example demonstrates basic NATS pub/sub functionality:
  - Connects to a NATS server
  - Subscribes to a topic
  - Publishes messages periodically
  - Handles incoming messages
  
  Hardware:
  - ESP32, ESP8266, or Arduino with Ethernet/WiFi shield
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
const char* natsServer = "192.168.1.100";  // Your NATS server IP
const int natsPort = 4222;
const char* natsUser = "home";             // Optional
const char* natsPass = "changeme";         // Optional

// Create NATS client
NATSClient nats;

// Message counter
unsigned long messageCount = 0;
unsigned long lastPublish = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    ; // Wait for serial port to connect
  }
  
  Serial.println("NATS Basic Pub/Sub Example");
  Serial.println("==========================");
  
  // Connect to WiFi
  connectWiFi();
  
  // Configure NATS client
  nats.setVerbose(true);  // Enable debug output
  nats.setClientID("arduino-example-01");
  
  // Set connection callbacks
  nats.onConnect([](bool connected) {
    Serial.println("NATS connected!");
  });
  
  nats.onDisconnect([](bool connected) {
    Serial.println("NATS disconnected!");
  });
  
  // Connect to NATS
  Serial.print("Connecting to NATS server...");
  if (nats.connect(natsServer, natsPort, natsUser, natsPass)) {
    Serial.println(" connected!");
  } else {
    Serial.print(" failed: ");
    Serial.println(nats.getLastError());
    while (1) {
      delay(1000);
    }
  }
  
  // Subscribe to a topic
  nats.subscribe("home.test.messages", [](const char* subject, const char* data, const char* reply) {
    Serial.print("Received message on ");
    Serial.print(subject);
    Serial.print(": ");
    Serial.println(data);
    
    // If there's a reply subject, respond
    if (reply && strlen(reply) > 0) {
      nats.publish(reply, "Message received!");
    }
  });
  
  // Subscribe to device commands
  nats.subscribe("home.devices.arduino.example-01.command", [](const char* subject, const char* data, const char* reply) {
    Serial.print("Received command: ");
    Serial.println(data);
    
    // Process command
    if (strcmp(data, "ping") == 0) {
      if (reply) {
        nats.publish(reply, "pong");
      }
    }
  });
  
  Serial.println("Setup complete!");
}

void loop() {
  // Must call this regularly to process NATS messages
  nats.loop();
  
  // Publish a message every 5 seconds
  if (millis() - lastPublish > 5000) {
    lastPublish = millis();
    
    char message[128];
    sprintf(message, "{\"count\":%lu,\"uptime\":%lu,\"freeHeap\":%d}", 
            messageCount++, millis() / 1000, ESP.getFreeHeap());
    
    if (nats.publish("home.devices.arduino.example-01.status", message)) {
      Serial.print("Published: ");
      Serial.println(message);
    }
  }
  
  // Reconnect WiFi if needed
  #if defined(ESP32) || defined(ESP8266)
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    connectWiFi();
  }
  #endif
}

void connectWiFi() {
  #if defined(ESP32) || defined(ESP8266)
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.print("Connected! IP address: ");
  Serial.println(WiFi.localIP());
  #endif
}