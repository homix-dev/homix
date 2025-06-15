package monitor

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

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

// Test device health tracking
func TestUpdateDeviceHealth(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	m := &HealthMonitor{
		logger:  logger,
		devices: make(map[string]*DeviceHealth),
	}

	// Update device health
	deviceID := "test-device-01"
	m.updateDeviceHealth(deviceID, true, 85)

	// Verify device was tracked
	assert.Contains(t, m.devices, deviceID)
	device := m.devices[deviceID]
	assert.True(t, device.Online)
	assert.Equal(t, 85, device.BatteryLevel)
	assert.NotNil(t, device.LastSeen)
}

// Test device state message handling
func TestHandleDeviceState(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	m := &HealthMonitor{
		logger:  logger,
		devices: make(map[string]*DeviceHealth),
	}

	// Create test state message
	state := map[string]interface{}{
		"device_id": "sensor-01",
		"timestamp": time.Now().Format(time.RFC3339),
		"state": map[string]interface{}{
			"temperature": 22.5,
			"humidity":    45.0,
			"battery":     90,
		},
	}

	data, err := json.Marshal(state)
	assert.NoError(t, err)

	msg := &nats.Msg{
		Subject: "home.devices.sensor.sensor-01.state",
		Data:    data,
	}

	// Handle the message
	m.handleDeviceState(msg)

	// Verify device health was updated
	assert.Contains(t, m.devices, "sensor-01")
	device := m.devices["sensor-01"]
	assert.True(t, device.Online)
	assert.Equal(t, 90, device.BatteryLevel)
}

// Test offline device detection
func TestCheckOfflineDevices(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	mockConn := new(MockNATSConn)
	
	m := &HealthMonitor{
		logger:   logger,
		devices:  make(map[string]*DeviceHealth),
		natsConn: mockConn,
	}

	now := time.Now()
	oldTime := now.Add(-10 * time.Minute)

	// Add devices with different last seen times
	m.devices["online-device"] = &DeviceHealth{
		ID:       "online-device",
		Online:   true,
		LastSeen: &now,
	}

	m.devices["offline-device"] = &DeviceHealth{
		ID:       "offline-device", 
		Online:   true,
		LastSeen: &oldTime,
	}

	// Expect alert to be published for offline device
	mockConn.On("Publish", "home.health.alerts", mock.Anything).Return(nil).Once()

	// Check offline devices
	m.checkOfflineDevices()

	// Verify states
	assert.True(t, m.devices["online-device"].Online)
	assert.False(t, m.devices["offline-device"].Online)
	
	// Verify alert was published
	mockConn.AssertExpectations(t)
}

// Test battery level alerts
func TestCheckBatteryLevels(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	mockConn := new(MockNATSConn)
	
	m := &HealthMonitor{
		logger:   logger,
		devices:  make(map[string]*DeviceHealth),
		natsConn: mockConn,
	}

	now := time.Now()

	// Add devices with different battery levels
	m.devices["good-battery"] = &DeviceHealth{
		ID:           "good-battery",
		Online:       true,
		BatteryLevel: 80,
		LastSeen:     &now,
	}

	m.devices["low-battery"] = &DeviceHealth{
		ID:           "low-battery",
		Online:       true,
		BatteryLevel: 15,
		LastSeen:     &now,
	}

	m.devices["critical-battery"] = &DeviceHealth{
		ID:           "critical-battery",
		Online:       true,
		BatteryLevel: 5,
		LastSeen:     &now,
	}

	// Expect alerts for low battery devices
	mockConn.On("Publish", "home.health.alerts", mock.Anything).Return(nil).Times(2)

	// Check battery levels
	m.checkBatteryLevels()

	// Verify alerts were published
	mockConn.AssertExpectations(t)
}

// Test health metrics retrieval
func TestGetHealthMetrics(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	m := &HealthMonitor{
		logger:  logger,
		devices: make(map[string]*DeviceHealth),
	}

	now := time.Now()
	oldTime := now.Add(-10 * time.Minute)

	// Add test devices
	m.devices["device-1"] = &DeviceHealth{
		ID:           "device-1",
		Online:       true,
		BatteryLevel: 90,
		LastSeen:     &now,
	}

	m.devices["device-2"] = &DeviceHealth{
		ID:           "device-2",
		Online:       false,
		BatteryLevel: 20,
		LastSeen:     &oldTime,
	}

	m.devices["device-3"] = &DeviceHealth{
		ID:           "device-3",
		Online:       true,
		BatteryLevel: 50,
		LastSeen:     &now,
	}

	// Get metrics
	metrics := m.GetHealthMetrics()

	// Verify metrics
	assert.Equal(t, 3, metrics.TotalDevices)
	assert.Equal(t, 2, metrics.OnlineDevices)
	assert.Equal(t, 1, metrics.OfflineDevices)
	assert.Equal(t, 1, metrics.LowBatteryDevices)
}

// Test device health list retrieval
func TestGetDeviceHealthList(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	m := &HealthMonitor{
		logger:  logger,
		devices: make(map[string]*DeviceHealth),
	}

	// Add test devices
	devices := []*DeviceHealth{
		{
			ID:           "device-1",
			Type:         "sensor",
			Name:         "Sensor 1",
			Online:       true,
			BatteryLevel: 85,
		},
		{
			ID:           "device-2",
			Type:         "switch",
			Name:         "Switch 1",
			Online:       false,
			BatteryLevel: 0,
		},
	}

	for _, d := range devices {
		m.devices[d.ID] = d
	}

	// Get device list
	result := m.GetDeviceHealthList()

	// Verify all devices are returned
	assert.Len(t, result, 2)
	
	// Check that devices are in the result
	ids := make(map[string]bool)
	for _, d := range result {
		ids[d.ID] = true
	}
	assert.True(t, ids["device-1"])
	assert.True(t, ids["device-2"])
}

// Test concurrent device updates
func TestConcurrentDeviceUpdates(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	m := &HealthMonitor{
		logger:  logger,
		devices: make(map[string]*DeviceHealth),
	}

	// Update devices concurrently
	done := make(chan bool, 100)
	for i := 0; i < 100; i++ {
		go func(idx int) {
			deviceID := fmt.Sprintf("device-%d", idx)
			battery := idx % 100
			m.updateDeviceHealth(deviceID, true, battery)
			done <- true
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 100; i++ {
		<-done
	}

	// Verify all devices were tracked
	assert.Len(t, m.devices, 100)
}

// Test device announcement handling
func TestHandleDeviceAnnounce(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	m := &HealthMonitor{
		logger:  logger,
		devices: make(map[string]*DeviceHealth),
	}

	// Create announcement message
	announcement := map[string]interface{}{
		"device_id":   "new-device",
		"device_type": "sensor",
		"device_name": "New Sensor",
		"status":      "online",
	}

	data, err := json.Marshal(announcement)
	assert.NoError(t, err)

	msg := &nats.Msg{
		Subject: "home.discovery.announce",
		Data:    data,
	}

	// Handle announcement
	m.handleDeviceAnnounce(msg)

	// Verify device was added
	assert.Contains(t, m.devices, "new-device")
	device := m.devices["new-device"]
	assert.Equal(t, "new-device", device.ID)
	assert.Equal(t, "sensor", device.Type)
	assert.Equal(t, "New Sensor", device.Name)
	assert.True(t, device.Online)
}