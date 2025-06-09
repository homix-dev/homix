package service_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	
	"github.com/calmera/nats-home-automation/services/discovery/internal/models"
	"github.com/calmera/nats-home-automation/services/discovery/internal/service"
)

// MockNATSConn is a mock NATS connection
type MockNATSConn struct {
	mock.Mock
}

func (m *MockNATSConn) Subscribe(subject string, cb nats.MsgHandler) (*nats.Subscription, error) {
	args := m.Called(subject, cb)
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*nats.Subscription), nil
}

func (m *MockNATSConn) Publish(subject string, data []byte) error {
	args := m.Called(subject, data)
	return args.Error(0)
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

func (m *MockNATSConn) JetStream() (nats.JetStreamContext, error) {
	args := m.Called()
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(nats.JetStreamContext), nil
}

// MockJetStream is a mock JetStream context
type MockJetStream struct {
	mock.Mock
}

func (m *MockJetStream) KeyValue(bucket string) (nats.KeyValue, error) {
	args := m.Called(bucket)
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(nats.KeyValue), nil
}

func (m *MockJetStream) CreateKeyValue(cfg *nats.KeyValueConfig) (nats.KeyValue, error) {
	args := m.Called(cfg)
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(nats.KeyValue), nil
}

// MockKeyValue is a mock KeyValue store
type MockKeyValue struct {
	mock.Mock
}

func (m *MockKeyValue) Get(key string) (nats.KeyValueEntry, error) {
	args := m.Called(key)
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(nats.KeyValueEntry), nil
}

func (m *MockKeyValue) Put(key string, value []byte) (uint64, error) {
	args := m.Called(key, value)
	return args.Get(0).(uint64), args.Error(1)
}

func (m *MockKeyValue) Delete(key string) error {
	args := m.Called(key)
	return args.Error(0)
}

func (m *MockKeyValue) Keys() ([]string, error) {
	args := m.Called()
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]string), nil
}

func (m *MockKeyValue) Watch(keys string, opts ...nats.WatchOpt) (nats.KeyWatcher, error) {
	args := m.Called(keys, opts)
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(nats.KeyWatcher), nil
}

func (m *MockKeyValue) WatchAll(opts ...nats.WatchOpt) (nats.KeyWatcher, error) {
	args := m.Called(opts)
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(nats.KeyWatcher), nil
}

func (m *MockKeyValue) Bucket() string {
	args := m.Called()
	return args.String(0)
}

func (m *MockKeyValue) PurgeDeletes(opts ...nats.PurgeOpt) error {
	args := m.Called(opts)
	return args.Error(0)
}

func (m *MockKeyValue) Status() (nats.KeyValueStatus, error) {
	args := m.Called()
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(nats.KeyValueStatus), nil
}

func TestDiscoveryService_RegisterDevice(t *testing.T) {
	tests := []struct {
		name    string
		device  models.Device
		wantErr bool
	}{
		{
			name: "valid device registration",
			device: models.Device{
				ID:           "test-device-01",
				Type:         "sensor",
				Name:         "Test Sensor",
				Manufacturer: "Test Inc",
				Model:        "TS-001",
				Capabilities: json.RawMessage(`{"sensors":["temperature","humidity"]}`),
			},
			wantErr: false,
		},
		{
			name: "device without ID",
			device: models.Device{
				Type: "sensor",
				Name: "Test Sensor",
			},
			wantErr: true,
		},
		{
			name: "device without type",
			device: models.Device{
				ID:   "test-device-02",
				Name: "Test Device",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mocks
			mockConn := new(MockNATSConn)
			mockJS := new(MockJetStream)
			mockKV := new(MockKeyValue)

			mockConn.On("JetStream").Return(mockJS, nil)
			mockJS.On("KeyValue", "devices").Return(mockKV, nil)

			if !tt.wantErr {
				deviceData, _ := json.Marshal(tt.device)
				mockKV.On("Put", tt.device.ID, deviceData).Return(uint64(1), nil)
			}

			// Create service with mocked connection
			svc := &service.DiscoveryService{}
			svc.SetNATSConn(mockConn)

			// Test registration
			err := svc.RegisterDevice(context.Background(), tt.device)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				mockKV.AssertExpectations(t)
			}
		})
	}
}

func TestDiscoveryService_GetDevice(t *testing.T) {
	deviceID := "test-device-01"
	device := models.Device{
		ID:           deviceID,
		Type:         "switch",
		Name:         "Test Switch",
		Manufacturer: "Test Inc",
		Model:        "SW-001",
	}

	// Setup mocks
	mockConn := new(MockNATSConn)
	mockJS := new(MockJetStream)
	mockKV := new(MockKeyValue)
	mockEntry := new(MockKeyValueEntry)

	mockConn.On("JetStream").Return(mockJS, nil)
	mockJS.On("KeyValue", "devices").Return(mockKV, nil)

	deviceData, _ := json.Marshal(device)
	mockEntry.On("Value").Return(deviceData)
	mockKV.On("Get", deviceID).Return(mockEntry, nil)

	// Create service
	svc := &service.DiscoveryService{}
	svc.SetNATSConn(mockConn)

	// Test get device
	result, err := svc.GetDevice(context.Background(), deviceID)
	require.NoError(t, err)
	assert.Equal(t, device.ID, result.ID)
	assert.Equal(t, device.Type, result.Type)
	assert.Equal(t, device.Name, result.Name)
}

func TestDiscoveryService_ListDevices(t *testing.T) {
	devices := []models.Device{
		{
			ID:   "device-01",
			Type: "sensor",
			Name: "Sensor 1",
		},
		{
			ID:   "device-02",
			Type: "switch",
			Name: "Switch 1",
		},
	}

	// Setup mocks
	mockConn := new(MockNATSConn)
	mockJS := new(MockJetStream)
	mockKV := new(MockKeyValue)

	mockConn.On("JetStream").Return(mockJS, nil)
	mockJS.On("KeyValue", "devices").Return(mockKV, nil)

	keys := []string{"device-01", "device-02"}
	mockKV.On("Keys").Return(keys, nil)

	for i, key := range keys {
		mockEntry := new(MockKeyValueEntry)
		deviceData, _ := json.Marshal(devices[i])
		mockEntry.On("Value").Return(deviceData)
		mockKV.On("Get", key).Return(mockEntry, nil)
	}

	// Create service
	svc := &service.DiscoveryService{}
	svc.SetNATSConn(mockConn)

	// Test list devices
	result, err := svc.ListDevices(context.Background())
	require.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, devices[0].ID, result[0].ID)
	assert.Equal(t, devices[1].ID, result[1].ID)
}

func TestDiscoveryService_HandleAnnouncement(t *testing.T) {
	announcement := map[string]interface{}{
		"device_id":    "new-device-01",
		"device_type":  "sensor",
		"name":         "New Sensor",
		"manufacturer": "Test Inc",
		"model":        "NS-001",
		"capabilities": map[string]interface{}{
			"sensors": []string{"temperature"},
		},
	}

	announcementData, _ := json.Marshal(announcement)

	// Setup mocks
	mockConn := new(MockNATSConn)
	mockJS := new(MockJetStream)
	mockKV := new(MockKeyValue)

	mockConn.On("JetStream").Return(mockJS, nil)
	mockJS.On("KeyValue", "devices").Return(mockKV, nil)

	// Expect device to be stored
	mockKV.On("Put", mock.Anything, mock.Anything).Return(uint64(1), nil)

	// Create service
	svc := &service.DiscoveryService{}
	svc.SetNATSConn(mockConn)

	// Create NATS message
	msg := &nats.Msg{
		Subject: "home.discovery.announce",
		Data:    announcementData,
	}

	// Test handling
	svc.HandleAnnouncement(msg)

	// Verify device was stored
	mockKV.AssertCalled(t, "Put", "new-device-01", mock.Anything)
}

// MockKeyValueEntry for testing
type MockKeyValueEntry struct {
	mock.Mock
}

func (m *MockKeyValueEntry) Value() []byte {
	args := m.Called()
	return args.Get(0).([]byte)
}

func (m *MockKeyValueEntry) Key() string {
	args := m.Called()
	return args.String(0)
}

func (m *MockKeyValueEntry) Revision() uint64 {
	args := m.Called()
	return args.Get(0).(uint64)
}

func (m *MockKeyValueEntry) Created() time.Time {
	args := m.Called()
	return args.Get(0).(time.Time)
}

func (m *MockKeyValueEntry) Delta() uint64 {
	args := m.Called()
	return args.Get(0).(uint64)
}

func (m *MockKeyValueEntry) Operation() nats.KeyValueOp {
	args := m.Called()
	return args.Get(0).(nats.KeyValueOp)
}

func (m *MockKeyValueEntry) Bucket() string {
	args := m.Called()
	return args.String(0)
}