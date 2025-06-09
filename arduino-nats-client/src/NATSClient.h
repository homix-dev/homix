/*
  NATSClient.h - NATS Client Library for Arduino
  Part of the NATS Home Automation project
  
  Supports ESP8266, ESP32, and Arduino boards with Ethernet/WiFi shields
*/

#ifndef NATSClient_h
#define NATSClient_h

#include <Arduino.h>
#include <functional>

#ifdef ESP32
  #include <WiFi.h>
  #include <WiFiClient.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <WiFiClient.h>
#else
  #include <Ethernet.h>
  #include <EthernetClient.h>
#endif

// NATS Protocol Constants
#define NATS_CR_LF "\r\n"
#define NATS_DEFAULT_PORT 4222
#define NATS_MAX_SUBJECT_LENGTH 256
#define NATS_MAX_PAYLOAD_SIZE 1024
#define NATS_INBOX_PREFIX "_INBOX."
#define NATS_CONNECTION_TIMEOUT 5000
#define NATS_PING_INTERVAL 120000  // 2 minutes
#define NATS_MAX_RECONNECT_ATTEMPTS 5

// Message handler callback types
typedef std::function<void(const char* subject, const char* data, const char* reply)> MessageHandler;
typedef std::function<void(bool connected)> ConnectionHandler;

// NATS Message structure
struct NATSMessage {
  char subject[NATS_MAX_SUBJECT_LENGTH];
  char reply[NATS_MAX_SUBJECT_LENGTH];
  char payload[NATS_MAX_PAYLOAD_SIZE];
  size_t payloadSize;
};

class NATSClient {
public:
  NATSClient();
  ~NATSClient();
  
  // Connection management
  bool connect(const char* server, uint16_t port = NATS_DEFAULT_PORT);
  bool connect(const char* server, uint16_t port, const char* user, const char* pass);
  bool connect(const char* server, uint16_t port, const char* token);
  void disconnect();
  bool connected();
  void loop();  // Must be called regularly in main loop
  
  // Basic pub/sub
  bool publish(const char* subject, const char* data);
  bool publish(const char* subject, const uint8_t* data, size_t size);
  bool subscribe(const char* subject, MessageHandler handler);
  bool unsubscribe(const char* subject);
  
  // Request/Reply
  bool request(const char* subject, const char* data, MessageHandler handler, unsigned long timeout = 5000);
  
  // Device discovery
  void setDeviceInfo(const char* deviceId, const char* deviceType, const char* deviceName);
  void enableAutoDiscovery(bool enable = true);
  void announceDevice();
  
  // Connection callbacks
  void onConnect(ConnectionHandler handler);
  void onDisconnect(ConnectionHandler handler);
  
  // Configuration
  void setClientID(const char* clientId);
  void setReconnect(bool enable);
  void setPingInterval(unsigned long interval);
  void setVerbose(bool verbose);
  
  // Status
  bool isReconnecting();
  unsigned long getLastPingTime();
  const char* getLastError();
  
private:
  // Network client (WiFi or Ethernet)
  #if defined(ESP32) || defined(ESP8266)
    WiFiClient _client;
  #else
    EthernetClient _client;
  #endif
  
  // Connection info
  char _server[64];
  uint16_t _port;
  char _user[64];
  char _pass[64];
  char _token[256];
  char _clientId[64];
  
  // Device info for discovery
  char _deviceId[64];
  char _deviceType[32];
  char _deviceName[64];
  bool _autoDiscovery;
  unsigned long _lastAnnounce;
  
  // Protocol state
  bool _connected;
  bool _reconnecting;
  bool _reconnectEnabled;
  int _reconnectAttempts;
  unsigned long _lastReconnectAttempt;
  
  // Subscriptions
  struct Subscription {
    char subject[NATS_MAX_SUBJECT_LENGTH];
    MessageHandler handler;
    int sid;
    bool active;
  };
  
  static const int MAX_SUBSCRIPTIONS = 10;
  Subscription _subscriptions[MAX_SUBSCRIPTIONS];
  int _nextSid;
  
  // Pending requests
  struct PendingRequest {
    char inbox[NATS_MAX_SUBJECT_LENGTH];
    MessageHandler handler;
    unsigned long timeout;
    unsigned long timestamp;
    bool active;
  };
  
  static const int MAX_PENDING_REQUESTS = 5;
  PendingRequest _pendingRequests[MAX_PENDING_REQUESTS];
  
  // Callbacks
  ConnectionHandler _connectHandler;
  ConnectionHandler _disconnectHandler;
  
  // Protocol handling
  char _inBuffer[NATS_MAX_PAYLOAD_SIZE + 512];
  size_t _inBufferPos;
  char _lastError[128];
  
  // Timing
  unsigned long _lastPing;
  unsigned long _pingInterval;
  
  // Options
  bool _verbose;
  
  // Internal methods
  bool _sendConnect();
  bool _sendPing();
  bool _sendPong();
  bool _processLine();
  bool _processMessage(const char* line);
  bool _processInfo(const char* json);
  bool _processMsg(const char* args);
  bool _processPing();
  bool _processOk();
  bool _processErr(const char* error);
  
  void _generateInbox(char* inbox);
  int _findSubscription(const char* subject);
  int _findPendingRequest(const char* inbox);
  void _cleanupPendingRequests();
  bool _reconnect();
  void _reset();
  
  // JSON helpers
  void _escapeJson(char* dest, const char* src, size_t maxLen);
  bool _parseJson(const char* json, const char* key, char* value, size_t valueLen);
};

#endif