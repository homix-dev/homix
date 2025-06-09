/**
 * Unit tests for Arduino NATS Client Library
 * 
 * Note: These tests are designed to run on a host system with
 * Arduino test framework, not on actual Arduino hardware.
 */

#include <Arduino.h>
#include <unity.h>
#include "../src/NATSClient.h"

// Mock WiFi client for testing
class MockClient : public Client {
private:
    bool _connected;
    String _writeBuffer;
    String _readBuffer;
    size_t _readPos;

public:
    MockClient() : _connected(false), _readPos(0) {}

    // Client interface implementation
    int connect(IPAddress ip, uint16_t port) override {
        _connected = true;
        return 1;
    }

    int connect(const char *host, uint16_t port) override {
        _connected = true;
        return 1;
    }

    size_t write(uint8_t b) override {
        _writeBuffer += (char)b;
        return 1;
    }

    size_t write(const uint8_t *buf, size_t size) override {
        for (size_t i = 0; i < size; i++) {
            _writeBuffer += (char)buf[i];
        }
        return size;
    }

    int available() override {
        return _readBuffer.length() - _readPos;
    }

    int read() override {
        if (_readPos < _readBuffer.length()) {
            return _readBuffer[_readPos++];
        }
        return -1;
    }

    int read(uint8_t *buf, size_t size) override {
        size_t count = 0;
        while (count < size && available() > 0) {
            buf[count++] = read();
        }
        return count;
    }

    int peek() override {
        if (_readPos < _readBuffer.length()) {
            return _readBuffer[_readPos];
        }
        return -1;
    }

    void flush() override {
        _writeBuffer = "";
    }

    void stop() override {
        _connected = false;
    }

    uint8_t connected() override {
        return _connected ? 1 : 0;
    }

    operator bool() override {
        return _connected;
    }

    // Test helpers
    void setResponse(const String& response) {
        _readBuffer = response;
        _readPos = 0;
    }

    String getWriteBuffer() {
        return _writeBuffer;
    }

    void clearBuffers() {
        _writeBuffer = "";
        _readBuffer = "";
        _readPos = 0;
    }
};

// Test fixtures
NATSClient* nats;
MockClient* mockClient;

void setUp() {
    mockClient = new MockClient();
    nats = new NATSClient(*mockClient);
}

void tearDown() {
    delete nats;
    delete mockClient;
}

// Test connection
void test_connect_without_auth() {
    // Mock server INFO and OK responses
    mockClient->setResponse("INFO {\"server_id\":\"test\",\"version\":\"2.0.0\"}\r\n+OK\r\n");
    
    bool result = nats->connect("test.server", 4222);
    
    TEST_ASSERT_TRUE(result);
    TEST_ASSERT_TRUE(nats->connected());
    
    // Check CONNECT command was sent
    String sent = mockClient->getWriteBuffer();
    TEST_ASSERT_TRUE(sent.indexOf("CONNECT {") >= 0);
    TEST_ASSERT_TRUE(sent.indexOf("\"verbose\":false") >= 0);
    TEST_ASSERT_TRUE(sent.indexOf("\"pedantic\":false") >= 0);
}

void test_connect_with_auth() {
    mockClient->setResponse("INFO {\"server_id\":\"test\",\"version\":\"2.0.0\"}\r\n+OK\r\n");
    
    bool result = nats->connect("test.server", 4222, "testuser", "testpass");
    
    TEST_ASSERT_TRUE(result);
    
    String sent = mockClient->getWriteBuffer();
    TEST_ASSERT_TRUE(sent.indexOf("\"user\":\"testuser\"") >= 0);
    TEST_ASSERT_TRUE(sent.indexOf("\"pass\":\"testpass\"") >= 0);
}

void test_connect_with_token() {
    mockClient->setResponse("INFO {\"server_id\":\"test\",\"version\":\"2.0.0\"}\r\n+OK\r\n");
    
    bool result = nats->connect("test.server", 4222, "test-token-123");
    
    TEST_ASSERT_TRUE(result);
    
    String sent = mockClient->getWriteBuffer();
    TEST_ASSERT_TRUE(sent.indexOf("\"auth_token\":\"test-token-123\"") >= 0);
}

// Test publishing
void test_publish_string() {
    mockClient->setResponse("INFO {\"server_id\":\"test\",\"version\":\"2.0.0\"}\r\n+OK\r\n+OK\r\n");
    nats->connect("test.server", 4222);
    
    mockClient->clearBuffers();
    
    bool result = nats->publish("test.subject", "Hello NATS!");
    
    TEST_ASSERT_TRUE(result);
    
    String sent = mockClient->getWriteBuffer();
    TEST_ASSERT_TRUE(sent.indexOf("PUB test.subject 11\r\n") >= 0);
    TEST_ASSERT_TRUE(sent.indexOf("Hello NATS!\r\n") >= 0);
}

void test_publish_binary() {
    mockClient->setResponse("INFO {\"server_id\":\"test\",\"version\":\"2.0.0\"}\r\n+OK\r\n+OK\r\n");
    nats->connect("test.server", 4222);
    
    mockClient->clearBuffers();
    
    uint8_t data[] = {0x01, 0x02, 0x03, 0x04};
    bool result = nats->publish("test.binary", data, 4);
    
    TEST_ASSERT_TRUE(result);
    
    String sent = mockClient->getWriteBuffer();
    TEST_ASSERT_TRUE(sent.indexOf("PUB test.binary 4\r\n") >= 0);
}

// Test subscribing
void test_subscribe() {
    mockClient->setResponse("INFO {\"server_id\":\"test\",\"version\":\"2.0.0\"}\r\n+OK\r\n+OK\r\n");
    nats->connect("test.server", 4222);
    
    mockClient->clearBuffers();
    
    int messageCount = 0;
    bool result = nats->subscribe("test.topic", [&messageCount](const char* subject, const char* data, const char* reply) {
        messageCount++;
    });
    
    TEST_ASSERT_TRUE(result);
    
    String sent = mockClient->getWriteBuffer();
    TEST_ASSERT_TRUE(sent.indexOf("SUB test.topic 1\r\n") >= 0);
}

// Test request/reply
void test_request() {
    mockClient->setResponse("INFO {\"server_id\":\"test\",\"version\":\"2.0.0\"}\r\n+OK\r\n+OK\r\n");
    nats->connect("test.server", 4222);
    
    mockClient->clearBuffers();
    
    String response;
    bool result = nats->request("time.service", "", [&response](const char* subject, const char* data, const char* reply) {
        response = String(data);
    }, 1000);
    
    // Request should create inbox subscription and publish
    String sent = mockClient->getWriteBuffer();
    TEST_ASSERT_TRUE(sent.indexOf("SUB _INBOX.") >= 0);
    TEST_ASSERT_TRUE(sent.indexOf("PUB time.service") >= 0);
}

// Test device info
void test_device_info() {
    nats->setDeviceInfo("test-device-01", "sensor", "Test Sensor");
    
    // Device info should be included in connect
    mockClient->setResponse("INFO {\"server_id\":\"test\",\"version\":\"2.0.0\"}\r\n+OK\r\n");
    nats->connect("test.server", 4222);
    
    String sent = mockClient->getWriteBuffer();
    TEST_ASSERT_TRUE(sent.indexOf("\"device_id\":\"test-device-01\"") >= 0);
    TEST_ASSERT_TRUE(sent.indexOf("\"device_type\":\"sensor\"") >= 0);
    TEST_ASSERT_TRUE(sent.indexOf("\"device_name\":\"Test Sensor\"") >= 0);
}

// Test auto discovery
void test_auto_discovery() {
    nats->setDeviceInfo("test-device-01", "sensor", "Test Sensor");
    nats->enableAutoDiscovery(true);
    
    mockClient->setResponse("INFO {\"server_id\":\"test\",\"version\":\"2.0.0\"}\r\n+OK\r\n+OK\r\n");
    nats->connect("test.server", 4222);
    
    mockClient->clearBuffers();
    
    // Should announce device
    nats->announceDevice();
    
    String sent = mockClient->getWriteBuffer();
    TEST_ASSERT_TRUE(sent.indexOf("PUB home.discovery.announce") >= 0);
    TEST_ASSERT_TRUE(sent.indexOf("\"device_id\":\"test-device-01\"") >= 0);
}

// Test ping/pong
void test_ping_handling() {
    mockClient->setResponse("INFO {\"server_id\":\"test\",\"version\":\"2.0.0\"}\r\n+OK\r\n");
    nats->connect("test.server", 4222);
    
    mockClient->clearBuffers();
    mockClient->setResponse("PING\r\n");
    
    // Process incoming ping
    nats->loop();
    
    String sent = mockClient->getWriteBuffer();
    TEST_ASSERT_TRUE(sent.indexOf("PONG\r\n") >= 0);
}

// Test message parsing
void test_message_parsing() {
    mockClient->setResponse("INFO {\"server_id\":\"test\",\"version\":\"2.0.0\"}\r\n+OK\r\n+OK\r\n");
    nats->connect("test.server", 4222);
    
    String receivedSubject;
    String receivedData;
    
    nats->subscribe("test.topic", [&](const char* subject, const char* data, const char* reply) {
        receivedSubject = String(subject);
        receivedData = String(data);
    });
    
    mockClient->clearBuffers();
    mockClient->setResponse("MSG test.topic 1 11\r\nHello World\r\n");
    
    // Process incoming message
    nats->loop();
    
    TEST_ASSERT_EQUAL_STRING("test.topic", receivedSubject.c_str());
    TEST_ASSERT_EQUAL_STRING("Hello World", receivedData.c_str());
}

// Test error handling
void test_connection_error() {
    mockClient->setResponse("-ERR 'Authorization Violation'\r\n");
    
    bool result = nats->connect("test.server", 4222, "baduser", "badpass");
    
    TEST_ASSERT_FALSE(result);
    TEST_ASSERT_FALSE(nats->connected());
    
    String error = nats->getLastError();
    TEST_ASSERT_TRUE(error.indexOf("Authorization") >= 0);
}

// Test reconnection
void test_auto_reconnect() {
    nats->setReconnect(true);
    
    mockClient->setResponse("INFO {\"server_id\":\"test\",\"version\":\"2.0.0\"}\r\n+OK\r\n");
    nats->connect("test.server", 4222);
    
    TEST_ASSERT_TRUE(nats->connected());
    
    // Simulate disconnect
    mockClient->stop();
    nats->loop();
    
    TEST_ASSERT_FALSE(nats->connected());
    TEST_ASSERT_TRUE(nats->isReconnecting());
}

// Main test runner
void setup() {
    UNITY_BEGIN();
    
    RUN_TEST(test_connect_without_auth);
    RUN_TEST(test_connect_with_auth);
    RUN_TEST(test_connect_with_token);
    RUN_TEST(test_publish_string);
    RUN_TEST(test_publish_binary);
    RUN_TEST(test_subscribe);
    RUN_TEST(test_request);
    RUN_TEST(test_device_info);
    RUN_TEST(test_auto_discovery);
    RUN_TEST(test_ping_handling);
    RUN_TEST(test_message_parsing);
    RUN_TEST(test_connection_error);
    RUN_TEST(test_auto_reconnect);
    
    UNITY_END();
}

void loop() {
    // Nothing to do
}