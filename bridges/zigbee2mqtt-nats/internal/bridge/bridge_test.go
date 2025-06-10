package bridge

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockMQTTClient mocks the MQTT client
type MockMQTTClient struct {
	mock.Mock
}

func (m *MockMQTTClient) IsConnected() bool {
	args := m.Called()
	return args.Bool(0)
}

func (m *MockMQTTClient) IsConnectionOpen() bool {
	args := m.Called()
	return args.Bool(0)
}

func (m *MockMQTTClient) Connect() mqtt.Token {
	args := m.Called()
	return args.Get(0).(mqtt.Token)
}

func (m *MockMQTTClient) Disconnect(quiesce uint) {
	m.Called(quiesce)
}

func (m *MockMQTTClient) Publish(topic string, qos byte, retained bool, payload interface{}) mqtt.Token {
	args := m.Called(topic, qos, retained, payload)
	return args.Get(0).(mqtt.Token)
}

func (m *MockMQTTClient) Subscribe(topic string, qos byte, callback mqtt.MessageHandler) mqtt.Token {
	args := m.Called(topic, qos, callback)
	return args.Get(0).(mqtt.Token)
}

func (m *MockMQTTClient) SubscribeMultiple(filters map[string]byte, callback mqtt.MessageHandler) mqtt.Token {
	args := m.Called(filters, callback)
	return args.Get(0).(mqtt.Token)
}

func (m *MockMQTTClient) Unsubscribe(topics ...string) mqtt.Token {
	args := m.Called(topics)
	return args.Get(0).(mqtt.Token)
}

func (m *MockMQTTClient) AddRoute(topic string, callback mqtt.MessageHandler) {
	m.Called(topic, callback)
}

func (m *MockMQTTClient) OptionsReader() mqtt.ClientOptionsReader {
	args := m.Called()
	return args.Get(0).(mqtt.ClientOptionsReader)
}

// MockNATSConn mocks the NATS connection
type MockNATSConn struct {
	mock.Mock
}

func (m *MockNATSConn) Subscribe(subject string, cb nats.MsgHandler) (*nats.Subscription, error) {
	args := m.Called(subject, cb)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*nats.Subscription), args.Error(1)
}

func (m *MockNATSConn) Publish(subject string, data []byte) error {
	args := m.Called(subject, data)
	return args.Error(0)
}

func (m *MockNATSConn) Close() {
	m.Called()
}

// MockToken mocks MQTT token
type MockToken struct {
	mock.Mock
}

func (m *MockToken) Wait() bool {
	args := m.Called()
	return args.Bool(0)
}

func (m *MockToken) WaitTimeout(timeout time.Duration) bool {
	args := m.Called(timeout)
	return args.Bool(0)
}

func (m *MockToken) Done() <-chan struct{} {
	args := m.Called()
	return args.Get(0).(<-chan struct{})
}

func (m *MockToken) Error() error {
	args := m.Called()
	return args.Error(0)
}

// Test device type detection
func TestGetDeviceType(t *testing.T) {
	b := &Bridge{
		logger: logrus.New(),
	}

	tests := []struct {
		name     string
		device   map[string]interface{}
		expected string
	}{
		{
			name: "temperature sensor",
			device: map[string]interface{}{
				"exposes": []interface{}{
					map[string]interface{}{
						"property": "temperature",
						"type":     "numeric",
					},
				},
			},
			expected: "sensor",
		},
		{
			name: "switch device",
			device: map[string]interface{}{
				"exposes": []interface{}{
					map[string]interface{}{
						"property": "state",
						"type":     "binary",
						"values":   []interface{}{"ON", "OFF"},
					},
				},
			},
			expected: "switch",
		},
		{
			name: "light device",
			device: map[string]interface{}{
				"exposes": []interface{}{
					map[string]interface{}{
						"property": "state",
						"type":     "binary",
					},
					map[string]interface{}{
						"property": "brightness",
						"type":     "numeric",
					},
				},
			},
			expected: "light",
		},
		{
			name: "unknown device",
			device: map[string]interface{}{
				"exposes": []interface{}{},
			},
			expected: "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := b.getDeviceType(tt.device)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// Test MQTT to NATS state translation
func TestHandleDeviceState(t *testing.T) {
	logger := logrus.New()
	mockNATS := new(MockNATSConn)

	b := &Bridge{
		logger:   logger,
		natsConn: mockNATS,
		devices: map[string]DeviceInfo{
			"sensor_01": {
				ID:           "sensor_01",
				Type:         "sensor",
				FriendlyName: "Living Room Sensor",
			},
		},
	}

	// Test state message
	state := map[string]interface{}{
		"temperature": 22.5,
		"humidity":    45.0,
		"battery":     85,
		"linkquality": 255,
	}

	payload, _ := json.Marshal(state)

	// Expect NATS publish
	mockNATS.On("Publish", "home.devices.sensor.sensor_01.state", mock.Anything).Return(nil)

	// Create MQTT message
	msg := &mockMessage{
		topic:   "zigbee2mqtt/sensor_01",
		payload: payload,
	}

	// Handle the message
	b.handleDeviceState(nil, msg)

	// Verify NATS publish was called
	mockNATS.AssertExpectations(t)
}

// Test device command handling
func TestHandleDeviceCommand(t *testing.T) {
	logger := logrus.New()
	mockMQTT := new(MockMQTTClient)
	mockToken := new(MockToken)

	b := &Bridge{
		logger:     logger,
		mqttClient: mockMQTT,
		devices: map[string]DeviceInfo{
			"switch_01": {
				ID:           "switch_01",
				Type:         "switch",
				FriendlyName: "Living Room Switch",
			},
		},
	}

	// Test command
	command := map[string]interface{}{
		"state": "ON",
	}

	data, _ := json.Marshal(command)

	// Setup mock expectations
	mockToken.On("Wait").Return(true)
	mockToken.On("Error").Return(nil)
	mockMQTT.On("Publish", "zigbee2mqtt/switch_01/set", byte(0), false, mock.Anything).Return(mockToken)

	// Create NATS message
	msg := &nats.Msg{
		Subject: "home.devices.switch.switch_01.set",
		Data:    data,
	}

	// Handle command
	b.handleDeviceCommand(msg)

	// Verify MQTT publish was called
	mockMQTT.AssertExpectations(t)
}

// Test device list handling
func TestHandleDeviceList(t *testing.T) {
	logger := logrus.New()
	mockNATS := new(MockNATSConn)

	b := &Bridge{
		logger:   logger,
		natsConn: mockNATS,
		devices:  make(map[string]DeviceInfo),
	}

	// Test device list from Zigbee2MQTT
	devices := []map[string]interface{}{
		{
			"ieee_address":  "0x00124b001234567",
			"friendly_name": "sensor_01",
			"type":          "EndDevice",
			"definition": map[string]interface{}{
				"model":       "WSDCGQ11LM",
				"vendor":      "Xiaomi",
				"description": "Aqara temperature, humidity and pressure sensor",
				"exposes": []interface{}{
					map[string]interface{}{
						"property": "temperature",
						"type":     "numeric",
					},
				},
			},
		},
	}

	payload, _ := json.Marshal(devices)

	// Expect device announcement
	mockNATS.On("Publish", "home.discovery.announce", mock.Anything).Return(nil)

	// Create MQTT message
	msg := &mockMessage{
		topic:   "zigbee2mqtt/bridge/devices",
		payload: payload,
	}

	// Handle device list
	b.handleDeviceList(nil, msg)

	// Verify device was registered
	assert.Contains(t, b.devices, "sensor_01")
	assert.Equal(t, "sensor", b.devices["sensor_01"].Type)

	// Verify announcement was published
	mockNATS.AssertExpectations(t)
}

// Test bridge info handling
func TestHandleBridgeInfo(t *testing.T) {
	logger := logrus.New()

	b := &Bridge{
		logger: logger,
	}

	// Test bridge info
	info := map[string]interface{}{
		"version":        "1.28.0",
		"commit":         "abc123",
		"coordinator": map[string]interface{}{
			"ieee_address": "0x00124b00123456",
			"type":         "zStack3x0",
		},
		"network": map[string]interface{}{
			"channel": 11,
			"pan_id":  "0x1a62",
		},
		"permit_join": false,
	}

	payload, _ := json.Marshal(info)

	// Create MQTT message
	msg := &mockMessage{
		topic:   "zigbee2mqtt/bridge/info",
		payload: payload,
	}

	// Handle bridge info
	b.handleBridgeInfo(nil, msg)

	// Verify info was stored
	assert.Equal(t, info, b.bridgeInfo)
}

// mockMessage implements mqtt.Message interface
type mockMessage struct {
	topic   string
	payload []byte
}

func (m *mockMessage) Duplicate() bool {
	return false
}

func (m *mockMessage) Qos() byte {
	return 0
}

func (m *mockMessage) Retained() bool {
	return false
}

func (m *mockMessage) Topic() string {
	return m.topic
}

func (m *mockMessage) MessageID() uint16 {
	return 0
}

func (m *mockMessage) Payload() []byte {
	return m.payload
}

func (m *mockMessage) Ack() {
}

// Test concurrent device updates
func TestConcurrentDeviceUpdates(t *testing.T) {
	logger := logrus.New()
	mockNATS := new(MockNATSConn)

	b := &Bridge{
		logger:   logger,
		natsConn: mockNATS,
		devices:  make(map[string]DeviceInfo),
	}

	// Allow any number of publishes
	mockNATS.On("Publish", mock.Anything, mock.Anything).Return(nil)

	// Update devices concurrently
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(idx int) {
			deviceID := fmt.Sprintf("device_%02d", idx)
			
			// Add device
			b.mu.Lock()
			b.devices[deviceID] = DeviceInfo{
				ID:   deviceID,
				Type: "sensor",
			}
			b.mu.Unlock()

			// Send state update
			state := map[string]interface{}{
				"temperature": float64(20 + idx),
			}
			payload, _ := json.Marshal(state)

			msg := &mockMessage{
				topic:   fmt.Sprintf("zigbee2mqtt/%s", deviceID),
				payload: payload,
			}

			b.handleDeviceState(nil, msg)
			done <- true
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}

	// Verify all devices were added
	assert.Len(t, b.devices, 10)
}