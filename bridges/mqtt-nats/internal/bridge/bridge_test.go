package bridge_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/nats-io/nats.go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/calmera/nats-home-automation/bridges/mqtt-nats/internal/bridge"
	"github.com/calmera/nats-home-automation/bridges/mqtt-nats/internal/config"
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

// MockMQTTToken mocks MQTT tokens
type MockMQTTToken struct {
	mock.Mock
}

func (m *MockMQTTToken) Wait() bool {
	args := m.Called()
	return args.Bool(0)
}

func (m *MockMQTTToken) WaitTimeout(timeout time.Duration) bool {
	args := m.Called(timeout)
	return args.Bool(0)
}

func (m *MockMQTTToken) Done() <-chan struct{} {
	args := m.Called()
	return args.Get(0).(<-chan struct{})
}

func (m *MockMQTTToken) Error() error {
	args := m.Called()
	return args.Error(0)
}

// MockNATSConn mocks NATS connection
type MockNATSConn struct {
	mock.Mock
}

func (m *MockNATSConn) Publish(subject string, data []byte) error {
	args := m.Called(subject, data)
	return args.Error(0)
}

func (m *MockNATSConn) Subscribe(subject string, cb nats.MsgHandler) (*nats.Subscription, error) {
	args := m.Called(subject, cb)
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*nats.Subscription), nil
}

func (m *MockNATSConn) Request(subject string, data []byte, timeout time.Duration) (*nats.Msg, error) {
	args := m.Called(subject, data, timeout)
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*nats.Msg), nil
}

func (m *MockNATSConn) Close() {
	m.Called()
}

func (m *MockNATSConn) IsConnected() bool {
	args := m.Called()
	return args.Bool(0)
}

func TestBridge_Start(t *testing.T) {
	// Create config
	cfg := &config.Config{
		MQTT: config.MQTTConfig{
			Broker:   "tcp://localhost:1883",
			ClientID: "test-bridge",
			Topics: []config.TopicMapping{
				{
					MQTTTopic: "test/+/state",
					NATSTopic: "home.devices.test.{1}.state",
				},
			},
		},
		NATS: config.NATSConfig{
			URL: "nats://localhost:4222",
			Subjects: []config.TopicMapping{
				{
					NATSTopic: "home.devices.test.*.command",
					MQTTTopic: "test/{1}/command",
				},
			},
		},
	}

	// Create mocks
	mockMQTT := new(MockMQTTClient)
	mockNATS := new(MockNATSConn)
	mockToken := new(MockMQTTToken)

	// Setup expectations
	mockMQTT.On("Connect").Return(mockToken)
	mockToken.On("Wait").Return(true)
	mockToken.On("Error").Return(nil)

	mockMQTT.On("Subscribe", "test/+/state", byte(1), mock.Anything).Return(mockToken)
	mockNATS.On("Subscribe", "home.devices.test.*.command", mock.Anything).Return(&nats.Subscription{}, nil)

	// Create bridge with mocks
	b := bridge.NewBridge(cfg)
	b.SetMQTTClient(mockMQTT)
	b.SetNATSConn(mockNATS)

	// Start bridge
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err := b.Start(ctx)
	require.NoError(t, err)

	// Verify expectations
	mockMQTT.AssertExpectations(t)
	mockNATS.AssertExpectations(t)
}

func TestBridge_HandleMQTTMessage(t *testing.T) {
	tests := []struct {
		name         string
		mqttTopic    string
		mqttPayload  string
		mapping      config.TopicMapping
		wantNATSTopic string
		wantTransform bool
	}{
		{
			name:        "simple topic mapping",
			mqttTopic:   "test/device01/state",
			mqttPayload: `{"temperature": 25.5}`,
			mapping: config.TopicMapping{
				MQTTTopic: "test/+/state",
				NATSTopic: "home.devices.test.{1}.state",
			},
			wantNATSTopic: "home.devices.test.device01.state",
			wantTransform: false,
		},
		{
			name:        "topic with transformation",
			mqttTopic:   "homeassistant/sensor/device01/state",
			mqttPayload: `{"temperature": 25.5}`,
			mapping: config.TopicMapping{
				MQTTTopic: "homeassistant/+/+/state",
				NATSTopic: "home.devices.{1}.{2}.state",
				Transform: func(data []byte) ([]byte, error) {
					var payload map[string]interface{}
					if err := json.Unmarshal(data, &payload); err != nil {
						return nil, err
					}
					// Add timestamp
					payload["timestamp"] = time.Now().Unix()
					return json.Marshal(payload)
				},
			},
			wantNATSTopic: "home.devices.sensor.device01.state",
			wantTransform: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockNATS := new(MockNATSConn)
			
			// Expect publish to NATS
			mockNATS.On("Publish", tt.wantNATSTopic, mock.Anything).Return(nil)

			// Create bridge
			cfg := &config.Config{
				MQTT: config.MQTTConfig{
					Topics: []config.TopicMapping{tt.mapping},
				},
			}
			b := bridge.NewBridge(cfg)
			b.SetNATSConn(mockNATS)

			// Create MQTT message
			msg := &MockMQTTMessage{
				topic:   tt.mqttTopic,
				payload: []byte(tt.mqttPayload),
			}

			// Handle message
			b.HandleMQTTMessage(nil, msg)

			// Verify
			mockNATS.AssertExpectations(t)
			
			// Check if transformation was applied
			if tt.wantTransform {
				mockNATS.AssertCalled(t, "Publish", tt.wantNATSTopic, mock.MatchedBy(func(data []byte) bool {
					var payload map[string]interface{}
					json.Unmarshal(data, &payload)
					_, hasTimestamp := payload["timestamp"]
					return hasTimestamp
				}))
			}
		})
	}
}

func TestBridge_HandleNATSMessage(t *testing.T) {
	tests := []struct {
		name         string
		natsSubject  string
		natsData     string
		mapping      config.TopicMapping
		wantMQTTTopic string
	}{
		{
			name:        "command mapping",
			natsSubject: "home.devices.switch.light01.command",
			natsData:    `{"action": "on"}`,
			mapping: config.TopicMapping{
				NATSTopic: "home.devices.switch.*.command",
				MQTTTopic: "command/switch/{1}",
			},
			wantMQTTTopic: "command/switch/light01",
		},
		{
			name:        "state update mapping",
			natsSubject: "home.devices.sensor.temp01.state",
			natsData:    `{"temperature": 22.3, "humidity": 45}`,
			mapping: config.TopicMapping{
				NATSTopic: "home.devices.sensor.*.state",
				MQTTTopic: "state/sensor/{1}",
			},
			wantMQTTTopic: "state/sensor/temp01",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockMQTT := new(MockMQTTClient)
			mockToken := new(MockMQTTToken)

			// Expect publish to MQTT
			mockMQTT.On("Publish", tt.wantMQTTTopic, byte(1), false, []byte(tt.natsData)).Return(mockToken)
			mockToken.On("Wait").Return(true)
			mockToken.On("Error").Return(nil)

			// Create bridge
			cfg := &config.Config{
				NATS: config.NATSConfig{
					Subjects: []config.TopicMapping{tt.mapping},
				},
			}
			b := bridge.NewBridge(cfg)
			b.SetMQTTClient(mockMQTT)

			// Create NATS message
			msg := &nats.Msg{
				Subject: tt.natsSubject,
				Data:    []byte(tt.natsData),
			}

			// Handle message
			b.HandleNATSMessage(msg)

			// Verify
			mockMQTT.AssertExpectations(t)
		})
	}
}

func TestBridge_TopicMatching(t *testing.T) {
	tests := []struct {
		name      string
		pattern   string
		topic     string
		wantMatch bool
		wantParts []string
	}{
		{
			name:      "single wildcard match",
			pattern:   "test/+/state",
			topic:     "test/device01/state",
			wantMatch: true,
			wantParts: []string{"device01"},
		},
		{
			name:      "multiple wildcards",
			pattern:   "homeassistant/+/+/state",
			topic:     "homeassistant/sensor/temp01/state",
			wantMatch: true,
			wantParts: []string{"sensor", "temp01"},
		},
		{
			name:      "no match",
			pattern:   "test/+/state",
			topic:     "test/device01/command",
			wantMatch: false,
			wantParts: nil,
		},
		{
			name:      "exact match",
			pattern:   "test/device/state",
			topic:     "test/device/state",
			wantMatch: true,
			wantParts: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			b := bridge.NewBridge(&config.Config{})
			match, parts := b.MatchTopic(tt.pattern, tt.topic)
			assert.Equal(t, tt.wantMatch, match)
			assert.Equal(t, tt.wantParts, parts)
		})
	}
}

// MockMQTTMessage mocks an MQTT message
type MockMQTTMessage struct {
	topic     string
	payload   []byte
	duplicate bool
	qos       byte
	retained  bool
	messageID uint16
	ack       func()
}

func (m *MockMQTTMessage) Duplicate() bool {
	return m.duplicate
}

func (m *MockMQTTMessage) Qos() byte {
	return m.qos
}

func (m *MockMQTTMessage) Retained() bool {
	return m.retained
}

func (m *MockMQTTMessage) Topic() string {
	return m.topic
}

func (m *MockMQTTMessage) MessageID() uint16 {
	return m.messageID
}

func (m *MockMQTTMessage) Payload() []byte {
	return m.payload
}

func (m *MockMQTTMessage) Ack() {
	if m.ack != nil {
		m.ack()
	}
}