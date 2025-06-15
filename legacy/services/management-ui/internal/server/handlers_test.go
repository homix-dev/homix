package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

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
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*nats.Subscription), args.Error(1)
}

func (m *MockNATSConn) JetStream() (nats.JetStreamContext, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(nats.JetStreamContext), args.Error(1)
}

func (m *MockNATSConn) Close() {
	m.Called()
}

func (m *MockNATSConn) IsConnected() bool {
	args := m.Called()
	return args.Bool(0)
}

// Test device list handler
func TestHandleGetDevices(t *testing.T) {
	logger := logrus.New()
	
	s := &Server{
		logger: logger,
		devices: map[string]*Device{
			"device1": {
				ID:     "device1",
				Type:   "sensor",
				Name:   "Test Sensor",
				Online: true,
			},
			"device2": {
				ID:     "device2",
				Type:   "switch",
				Name:   "Test Switch",
				Online: false,
			},
		},
	}

	// Create request
	req := httptest.NewRequest("GET", "/api/v1/devices", nil)
	w := httptest.NewRecorder()

	// Handle request
	s.handleGetDevices(w, req)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)

	// Check devices in response
	devices, ok := response.Data.([]interface{})
	assert.True(t, ok)
	assert.Len(t, devices, 2)
}

// Test get single device handler
func TestHandleGetDevice(t *testing.T) {
	logger := logrus.New()
	
	s := &Server{
		logger: logger,
		devices: map[string]*Device{
			"device1": {
				ID:       "device1",
				Type:     "sensor",
				Name:     "Test Sensor",
				Online:   true,
				LastSeen: time.Now(),
			},
		},
	}

	// Create request with device ID
	req := httptest.NewRequest("GET", "/api/v1/devices/device1", nil)
	req = mux.SetURLVars(req, map[string]string{"id": "device1"})
	w := httptest.NewRecorder()

	// Handle request
	s.handleGetDevice(w, req)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)

	// Check device in response
	device, ok := response.Data.(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "device1", device["id"])
	assert.Equal(t, "sensor", device["type"])
}

// Test device not found
func TestHandleGetDeviceNotFound(t *testing.T) {
	logger := logrus.New()
	
	s := &Server{
		logger:  logger,
		devices: make(map[string]*Device),
	}

	// Create request with non-existent device ID
	req := httptest.NewRequest("GET", "/api/v1/devices/nonexistent", nil)
	req = mux.SetURLVars(req, map[string]string{"id": "nonexistent"})
	w := httptest.NewRecorder()

	// Handle request
	s.handleGetDevice(w, req)

	// Check response
	assert.Equal(t, http.StatusNotFound, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.False(t, response.Success)
	assert.Equal(t, "Device not found", response.Error)
}

// Test device command handler
func TestHandleDeviceCommand(t *testing.T) {
	logger := logrus.New()
	mockNATS := new(MockNATSConn)
	
	s := &Server{
		logger:   logger,
		natsConn: mockNATS,
		devices: map[string]*Device{
			"device1": {
				ID:   "device1",
				Type: "switch",
				Name: "Test Switch",
			},
		},
	}

	// Command payload
	command := DeviceCommand{
		Command: "on",
		Data: map[string]interface{}{
			"brightness": 75,
		},
	}

	body, _ := json.Marshal(command)

	// Expect NATS publish
	mockNATS.On("Publish", "home.devices.switch.device1.set", mock.Anything).Return(nil)

	// Create request
	req := httptest.NewRequest("POST", "/api/v1/devices/device1/command", bytes.NewReader(body))
	req = mux.SetURLVars(req, map[string]string{"id": "device1"})
	w := httptest.NewRecorder()

	// Handle request
	s.handleDeviceCommand(w, req)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)

	// Verify NATS publish was called
	mockNATS.AssertExpectations(t)
}

// Test automation list handler
func TestHandleGetAutomations(t *testing.T) {
	logger := logrus.New()
	
	s := &Server{
		logger: logger,
		automations: map[string]*Automation{
			"auto1": {
				ID:          "auto1",
				Name:        "Test Automation",
				Description: "Test description",
				Enabled:     true,
			},
		},
	}

	// Create request
	req := httptest.NewRequest("GET", "/api/v1/automations", nil)
	w := httptest.NewRecorder()

	// Handle request
	s.handleGetAutomations(w, req)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)

	// Check automations in response
	automations, ok := response.Data.([]interface{})
	assert.True(t, ok)
	assert.Len(t, automations, 1)
}

// Test scene activation handler
func TestHandleActivateScene(t *testing.T) {
	logger := logrus.New()
	mockNATS := new(MockNATSConn)
	
	s := &Server{
		logger:   logger,
		natsConn: mockNATS,
		scenes: map[string]*Scene{
			"scene1": {
				ID:   "scene1",
				Name: "Night Mode",
				Entities: []SceneEntity{
					{
						DeviceID: "light1",
						Command:  "set",
						Data: map[string]interface{}{
							"state": "off",
						},
					},
				},
			},
		},
	}

	// Expect scene activation publish
	mockNATS.On("Publish", "home.scenes.scene1.activate", mock.Anything).Return(nil)

	// Create request
	req := httptest.NewRequest("POST", "/api/v1/scenes/scene1/activate", nil)
	req = mux.SetURLVars(req, map[string]string{"id": "scene1"})
	w := httptest.NewRecorder()

	// Handle request
	s.handleActivateScene(w, req)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)

	// Verify NATS publish was called
	mockNATS.AssertExpectations(t)
}

// Test discovery start handler
func TestHandleStartDiscovery(t *testing.T) {
	logger := logrus.New()
	mockNATS := new(MockNATSConn)
	
	s := &Server{
		logger:   logger,
		natsConn: mockNATS,
	}

	// Expect discovery publish
	mockNATS.On("Publish", "home.discovery.start", mock.Anything).Return(nil)

	// Create request
	req := httptest.NewRequest("POST", "/api/v1/devices/discovery/start", nil)
	w := httptest.NewRecorder()

	// Handle request
	s.handleStartDiscovery(w, req)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)
	assert.Equal(t, "Device discovery started", response.Message)

	// Verify discovery was started
	assert.True(t, s.discoveryActive)
	assert.NotZero(t, s.discoveryStartTime)

	// Verify NATS publish was called
	mockNATS.AssertExpectations(t)
}

// Test discovery status handler
func TestHandleDiscoveryStatus(t *testing.T) {
	logger := logrus.New()
	
	s := &Server{
		logger:             logger,
		discoveryActive:    true,
		discoveryStartTime: time.Now(),
	}

	// Create request
	req := httptest.NewRequest("GET", "/api/v1/devices/discovery/status", nil)
	w := httptest.NewRecorder()

	// Handle request
	s.handleDiscoveryStatus(w, req)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)

	// Check status data
	status, ok := response.Data.(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, true, status["active"])
	assert.Contains(t, status, "remaining_seconds")
}

// Test system info handler
func TestHandleSystemInfo(t *testing.T) {
	logger := logrus.New()
	mockNATS := new(MockNATSConn)
	
	s := &Server{
		logger:   logger,
		natsConn: mockNATS,
		devices: map[string]*Device{
			"d1": {},
			"d2": {},
		},
		automations: map[string]*Automation{
			"a1": {},
		},
		scenes: map[string]*Scene{
			"s1": {},
		},
	}

	// Mock NATS connection status
	mockNATS.On("IsConnected").Return(true)

	// Create request
	req := httptest.NewRequest("GET", "/api/v1/system/info", nil)
	w := httptest.NewRecorder()

	// Handle request
	s.handleSystemInfo(w, req)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)

	// Check system info
	info, ok := response.Data.(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "1.0.0", info["version"])
	assert.Equal(t, float64(2), info["device_count"])
	assert.Equal(t, float64(1), info["automation_count"])
	assert.Equal(t, float64(1), info["scene_count"])
	assert.Equal(t, true, info["nats_connected"])
}