/*
  NATSClient.cpp - NATS Client Library for Arduino
  Part of the NATS Home Automation project
*/

#include "NATSClient.h"

NATSClient::NATSClient() {
  _connected = false;
  _reconnecting = false;
  _reconnectEnabled = true;
  _reconnectAttempts = 0;
  _lastReconnectAttempt = 0;
  _nextSid = 1;
  _autoDiscovery = false;
  _lastAnnounce = 0;
  _lastPing = 0;
  _pingInterval = NATS_PING_INTERVAL;
  _verbose = false;
  _inBufferPos = 0;
  
  // Clear arrays
  memset(_server, 0, sizeof(_server));
  memset(_user, 0, sizeof(_user));
  memset(_pass, 0, sizeof(_pass));
  memset(_token, 0, sizeof(_token));
  memset(_clientId, 0, sizeof(_clientId));
  memset(_deviceId, 0, sizeof(_deviceId));
  memset(_deviceType, 0, sizeof(_deviceType));
  memset(_deviceName, 0, sizeof(_deviceName));
  memset(_lastError, 0, sizeof(_lastError));
  
  // Initialize subscriptions
  for (int i = 0; i < MAX_SUBSCRIPTIONS; i++) {
    _subscriptions[i].active = false;
  }
  
  // Initialize pending requests
  for (int i = 0; i < MAX_PENDING_REQUESTS; i++) {
    _pendingRequests[i].active = false;
  }
  
  // Generate default client ID
  sprintf(_clientId, "arduino_%lu", millis());
}

NATSClient::~NATSClient() {
  disconnect();
}

bool NATSClient::connect(const char* server, uint16_t port) {
  return connect(server, port, "", "");
}

bool NATSClient::connect(const char* server, uint16_t port, const char* user, const char* pass) {
  strncpy(_server, server, sizeof(_server) - 1);
  _port = port;
  strncpy(_user, user, sizeof(_user) - 1);
  strncpy(_pass, pass, sizeof(_pass) - 1);
  
  if (_verbose) {
    Serial.print(F("NATS: Connecting to "));
    Serial.print(server);
    Serial.print(F(":"));
    Serial.println(port);
  }
  
  // Connect to server
  if (!_client.connect(server, port)) {
    strcpy(_lastError, "Connection failed");
    return false;
  }
  
  // Wait for INFO
  unsigned long start = millis();
  while (millis() - start < NATS_CONNECTION_TIMEOUT) {
    if (_client.available()) {
      char c = _client.read();
      _inBuffer[_inBufferPos++] = c;
      
      if (c == '\n' && _inBufferPos > 1 && _inBuffer[_inBufferPos - 2] == '\r') {
        _inBuffer[_inBufferPos - 2] = '\0';
        _inBufferPos = 0;
        
        if (strncmp(_inBuffer, "INFO", 4) == 0) {
          _processInfo(_inBuffer + 5);
          break;
        }
      }
    }
  }
  
  // Send CONNECT
  if (!_sendConnect()) {
    _client.stop();
    return false;
  }
  
  // Wait for +OK
  start = millis();
  while (millis() - start < NATS_CONNECTION_TIMEOUT) {
    if (_client.available()) {
      char c = _client.read();
      _inBuffer[_inBufferPos++] = c;
      
      if (c == '\n' && _inBufferPos > 1 && _inBuffer[_inBufferPos - 2] == '\r') {
        _inBuffer[_inBufferPos - 2] = '\0';
        _inBufferPos = 0;
        
        if (strcmp(_inBuffer, "+OK") == 0) {
          _connected = true;
          _reconnectAttempts = 0;
          _lastPing = millis();
          
          if (_verbose) {
            Serial.println(F("NATS: Connected"));
          }
          
          if (_connectHandler) {
            _connectHandler(true);
          }
          
          // Re-subscribe to all active subscriptions
          for (int i = 0; i < MAX_SUBSCRIPTIONS; i++) {
            if (_subscriptions[i].active) {
              char cmd[NATS_MAX_SUBJECT_LENGTH + 20];
              sprintf(cmd, "SUB %s %d" NATS_CR_LF, _subscriptions[i].subject, _subscriptions[i].sid);
              _client.print(cmd);
            }
          }
          
          // Announce device if auto-discovery is enabled
          if (_autoDiscovery && strlen(_deviceId) > 0) {
            announceDevice();
          }
          
          return true;
        } else if (strncmp(_inBuffer, "-ERR", 4) == 0) {
          strncpy(_lastError, _inBuffer + 5, sizeof(_lastError) - 1);
          _client.stop();
          return false;
        }
      }
    }
  }
  
  strcpy(_lastError, "Connection timeout");
  _client.stop();
  return false;
}

bool NATSClient::connect(const char* server, uint16_t port, const char* token) {
  strncpy(_token, token, sizeof(_token) - 1);
  return connect(server, port, "", "");
}

void NATSClient::disconnect() {
  if (_connected) {
    _client.stop();
    _connected = false;
    
    if (_disconnectHandler) {
      _disconnectHandler(false);
    }
    
    if (_verbose) {
      Serial.println(F("NATS: Disconnected"));
    }
  }
}

bool NATSClient::connected() {
  return _connected && _client.connected();
}

void NATSClient::loop() {
  // Check connection
  if (!_client.connected()) {
    if (_connected) {
      _connected = false;
      if (_disconnectHandler) {
        _disconnectHandler(false);
      }
    }
    
    if (_reconnectEnabled && !_reconnecting) {
      unsigned long now = millis();
      if (now - _lastReconnectAttempt > 5000) {  // Try every 5 seconds
        _lastReconnectAttempt = now;
        _reconnect();
      }
    }
    return;
  }
  
  // Process incoming data
  while (_client.available()) {
    char c = _client.read();
    
    if (_inBufferPos < sizeof(_inBuffer) - 1) {
      _inBuffer[_inBufferPos++] = c;
    }
    
    if (c == '\n' && _inBufferPos > 1 && _inBuffer[_inBufferPos - 2] == '\r') {
      _inBuffer[_inBufferPos - 2] = '\0';
      _processLine();
      _inBufferPos = 0;
    }
  }
  
  // Send PING if needed
  if (_connected && millis() - _lastPing > _pingInterval) {
    _sendPing();
  }
  
  // Cleanup expired requests
  _cleanupPendingRequests();
  
  // Re-announce device periodically if auto-discovery is enabled
  if (_connected && _autoDiscovery && strlen(_deviceId) > 0) {
    if (millis() - _lastAnnounce > 300000) {  // Every 5 minutes
      announceDevice();
    }
  }
}

bool NATSClient::publish(const char* subject, const char* data) {
  return publish(subject, (const uint8_t*)data, strlen(data));
}

bool NATSClient::publish(const char* subject, const uint8_t* data, size_t size) {
  if (!_connected) {
    strcpy(_lastError, "Not connected");
    return false;
  }
  
  char cmd[512];
  sprintf(cmd, "PUB %s %d" NATS_CR_LF, subject, size);
  
  _client.print(cmd);
  _client.write(data, size);
  _client.print(NATS_CR_LF);
  
  if (_verbose) {
    Serial.print(F("NATS: Published to "));
    Serial.println(subject);
  }
  
  return true;
}

bool NATSClient::subscribe(const char* subject, MessageHandler handler) {
  if (!_connected) {
    strcpy(_lastError, "Not connected");
    return false;
  }
  
  // Find free slot
  int slot = -1;
  for (int i = 0; i < MAX_SUBSCRIPTIONS; i++) {
    if (!_subscriptions[i].active) {
      slot = i;
      break;
    }
  }
  
  if (slot == -1) {
    strcpy(_lastError, "Max subscriptions reached");
    return false;
  }
  
  // Store subscription
  strncpy(_subscriptions[slot].subject, subject, NATS_MAX_SUBJECT_LENGTH - 1);
  _subscriptions[slot].handler = handler;
  _subscriptions[slot].sid = _nextSid++;
  _subscriptions[slot].active = true;
  
  // Send SUB command
  char cmd[NATS_MAX_SUBJECT_LENGTH + 20];
  sprintf(cmd, "SUB %s %d" NATS_CR_LF, subject, _subscriptions[slot].sid);
  _client.print(cmd);
  
  if (_verbose) {
    Serial.print(F("NATS: Subscribed to "));
    Serial.println(subject);
  }
  
  return true;
}

bool NATSClient::unsubscribe(const char* subject) {
  if (!_connected) {
    return false;
  }
  
  int slot = _findSubscription(subject);
  if (slot == -1) {
    return false;
  }
  
  // Send UNSUB command
  char cmd[20];
  sprintf(cmd, "UNSUB %d" NATS_CR_LF, _subscriptions[slot].sid);
  _client.print(cmd);
  
  // Mark as inactive
  _subscriptions[slot].active = false;
  
  if (_verbose) {
    Serial.print(F("NATS: Unsubscribed from "));
    Serial.println(subject);
  }
  
  return true;
}

bool NATSClient::request(const char* subject, const char* data, MessageHandler handler, unsigned long timeout) {
  if (!_connected) {
    strcpy(_lastError, "Not connected");
    return false;
  }
  
  // Find free slot for pending request
  int slot = -1;
  for (int i = 0; i < MAX_PENDING_REQUESTS; i++) {
    if (!_pendingRequests[i].active) {
      slot = i;
      break;
    }
  }
  
  if (slot == -1) {
    strcpy(_lastError, "Max pending requests reached");
    return false;
  }
  
  // Generate inbox
  _generateInbox(_pendingRequests[slot].inbox);
  
  // Subscribe to inbox
  if (!subscribe(_pendingRequests[slot].inbox, handler)) {
    return false;
  }
  
  // Store request info
  _pendingRequests[slot].handler = handler;
  _pendingRequests[slot].timeout = timeout;
  _pendingRequests[slot].timestamp = millis();
  _pendingRequests[slot].active = true;
  
  // Publish request with reply-to
  char cmd[512];
  sprintf(cmd, "PUB %s %s %d" NATS_CR_LF, subject, _pendingRequests[slot].inbox, strlen(data));
  _client.print(cmd);
  _client.print(data);
  _client.print(NATS_CR_LF);
  
  return true;
}

void NATSClient::setDeviceInfo(const char* deviceId, const char* deviceType, const char* deviceName) {
  strncpy(_deviceId, deviceId, sizeof(_deviceId) - 1);
  strncpy(_deviceType, deviceType, sizeof(_deviceType) - 1);
  strncpy(_deviceName, deviceName, sizeof(_deviceName) - 1);
}

void NATSClient::enableAutoDiscovery(bool enable) {
  _autoDiscovery = enable;
}

void NATSClient::announceDevice() {
  if (!_connected || strlen(_deviceId) == 0) {
    return;
  }
  
  char json[512];
  sprintf(json, "{\"device_id\":\"%s\",\"device_type\":\"%s\",\"name\":\"%s\",\"platform\":\"arduino\",\"online\":true}",
          _deviceId, _deviceType, _deviceName);
  
  publish("home.discovery.announce", json);
  _lastAnnounce = millis();
  
  if (_verbose) {
    Serial.println(F("NATS: Device announced"));
  }
}

void NATSClient::onConnect(ConnectionHandler handler) {
  _connectHandler = handler;
}

void NATSClient::onDisconnect(ConnectionHandler handler) {
  _disconnectHandler = handler;
}

void NATSClient::setClientID(const char* clientId) {
  strncpy(_clientId, clientId, sizeof(_clientId) - 1);
}

void NATSClient::setReconnect(bool enable) {
  _reconnectEnabled = enable;
}

void NATSClient::setPingInterval(unsigned long interval) {
  _pingInterval = interval;
}

void NATSClient::setVerbose(bool verbose) {
  _verbose = verbose;
}

bool NATSClient::isReconnecting() {
  return _reconnecting;
}

unsigned long NATSClient::getLastPingTime() {
  return _lastPing;
}

const char* NATSClient::getLastError() {
  return _lastError;
}

// Private methods

bool NATSClient::_sendConnect() {
  char json[512];
  
  if (strlen(_token) > 0) {
    sprintf(json, "{\"verbose\":false,\"pedantic\":false,\"tls_required\":false,\"name\":\"%s\",\"auth_token\":\"%s\",\"proto\":1,\"echo\":true}",
            _clientId, _token);
  } else if (strlen(_user) > 0) {
    sprintf(json, "{\"verbose\":false,\"pedantic\":false,\"tls_required\":false,\"name\":\"%s\",\"user\":\"%s\",\"pass\":\"%s\",\"proto\":1,\"echo\":true}",
            _clientId, _user, _pass);
  } else {
    sprintf(json, "{\"verbose\":false,\"pedantic\":false,\"tls_required\":false,\"name\":\"%s\",\"proto\":1,\"echo\":true}",
            _clientId);
  }
  
  _client.print("CONNECT ");
  _client.print(json);
  _client.print(NATS_CR_LF);
  
  return true;
}

bool NATSClient::_sendPing() {
  if (!_connected) {
    return false;
  }
  
  _client.print("PING" NATS_CR_LF);
  _lastPing = millis();
  
  if (_verbose) {
    Serial.println(F("NATS: PING sent"));
  }
  
  return true;
}

bool NATSClient::_sendPong() {
  if (!_connected) {
    return false;
  }
  
  _client.print("PONG" NATS_CR_LF);
  
  if (_verbose) {
    Serial.println(F("NATS: PONG sent"));
  }
  
  return true;
}

bool NATSClient::_processLine() {
  if (_verbose) {
    Serial.print(F("NATS < "));
    Serial.println(_inBuffer);
  }
  
  // Parse protocol messages
  if (strncmp(_inBuffer, "MSG", 3) == 0) {
    return _processMsg(_inBuffer + 4);
  } else if (strncmp(_inBuffer, "PING", 4) == 0) {
    return _processPing();
  } else if (strncmp(_inBuffer, "PONG", 4) == 0) {
    return true;  // PONG received
  } else if (strncmp(_inBuffer, "+OK", 3) == 0) {
    return _processOk();
  } else if (strncmp(_inBuffer, "-ERR", 4) == 0) {
    return _processErr(_inBuffer + 5);
  } else if (strncmp(_inBuffer, "INFO", 4) == 0) {
    return _processInfo(_inBuffer + 5);
  }
  
  return true;
}

bool NATSClient::_processMsg(const char* args) {
  // Parse MSG arguments: subject sid [reply] size
  char subject[NATS_MAX_SUBJECT_LENGTH];
  char reply[NATS_MAX_SUBJECT_LENGTH];
  int sid;
  int size;
  
  reply[0] = '\0';
  
  // Try with reply field
  int count = sscanf(args, "%s %d %s %d", subject, &sid, reply, &size);
  if (count == 3) {
    // No reply field
    size = atoi(reply);
    reply[0] = '\0';
  } else if (count != 4) {
    return false;
  }
  
  // Read payload
  char payload[NATS_MAX_PAYLOAD_SIZE];
  size_t bytesRead = 0;
  
  while (bytesRead < size && bytesRead < NATS_MAX_PAYLOAD_SIZE - 1) {
    if (_client.available()) {
      payload[bytesRead++] = _client.read();
    }
  }
  payload[bytesRead] = '\0';
  
  // Read and discard CR LF
  while (_client.available() && _client.peek() == '\r' || _client.peek() == '\n') {
    _client.read();
  }
  
  // Find subscription by SID
  for (int i = 0; i < MAX_SUBSCRIPTIONS; i++) {
    if (_subscriptions[i].active && _subscriptions[i].sid == sid) {
      if (_subscriptions[i].handler) {
        _subscriptions[i].handler(subject, payload, reply);
      }
      return true;
    }
  }
  
  return false;
}

bool NATSClient::_processInfo(const char* json) {
  // For now, just acknowledge INFO
  if (_verbose) {
    Serial.println(F("NATS: INFO received"));
  }
  return true;
}

bool NATSClient::_processPing() {
  return _sendPong();
}

bool NATSClient::_processOk() {
  return true;
}

bool NATSClient::_processErr(const char* error) {
  strncpy(_lastError, error, sizeof(_lastError) - 1);
  if (_verbose) {
    Serial.print(F("NATS Error: "));
    Serial.println(error);
  }
  return false;
}

void NATSClient::_generateInbox(char* inbox) {
  sprintf(inbox, "%s%08lX%04X", NATS_INBOX_PREFIX, millis(), random(0xFFFF));
}

int NATSClient::_findSubscription(const char* subject) {
  for (int i = 0; i < MAX_SUBSCRIPTIONS; i++) {
    if (_subscriptions[i].active && strcmp(_subscriptions[i].subject, subject) == 0) {
      return i;
    }
  }
  return -1;
}

int NATSClient::_findPendingRequest(const char* inbox) {
  for (int i = 0; i < MAX_PENDING_REQUESTS; i++) {
    if (_pendingRequests[i].active && strcmp(_pendingRequests[i].inbox, inbox) == 0) {
      return i;
    }
  }
  return -1;
}

void NATSClient::_cleanupPendingRequests() {
  unsigned long now = millis();
  
  for (int i = 0; i < MAX_PENDING_REQUESTS; i++) {
    if (_pendingRequests[i].active) {
      if (now - _pendingRequests[i].timestamp > _pendingRequests[i].timeout) {
        // Timeout - unsubscribe and cleanup
        unsubscribe(_pendingRequests[i].inbox);
        _pendingRequests[i].active = false;
      }
    }
  }
}

bool NATSClient::_reconnect() {
  if (_reconnectAttempts >= NATS_MAX_RECONNECT_ATTEMPTS) {
    return false;
  }
  
  _reconnecting = true;
  _reconnectAttempts++;
  
  if (_verbose) {
    Serial.print(F("NATS: Reconnecting (attempt "));
    Serial.print(_reconnectAttempts);
    Serial.println(F(")"));
  }
  
  bool result = connect(_server, _port, _user, _pass);
  _reconnecting = false;
  
  return result;
}

void NATSClient::_reset() {
  _connected = false;
  _inBufferPos = 0;
  _lastPing = 0;
}