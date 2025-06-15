package service_test

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	
	"github.com/homix-dev/homix/services/discovery/internal/config"
	"github.com/homix-dev/homix/services/discovery/internal/models"
	"github.com/homix-dev/homix/services/discovery/internal/service"
)

func TestService_New(t *testing.T) {
	cfg := &config.Config{
		NATS: config.NATS{
			URL: "nats://localhost:4222",
		},
		Store: config.Store{
			Bucket: "test-devices",
		},
	}
	
	logger := logrus.New()
	
	svc, err := service.New(cfg, logger)
	require.NoError(t, err)
	assert.NotNil(t, svc)
}

func TestService_ProcessDeviceAnnouncement(t *testing.T) {
	// This test requires a running NATS server or mock
	t.Skip("Integration test - requires NATS server")
	
	cfg := &config.Config{
		NATS: config.NATS{
			URL: "nats://localhost:4222",
		},
		Store: config.Store{
			Bucket: "test-devices",
		},
	}
	
	logger := logrus.New()
	svc, err := service.New(cfg, logger)
	require.NoError(t, err)
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	// Start the service in a goroutine
	errCh := make(chan error, 1)
	go func() {
		errCh <- svc.Run(ctx)
	}()
	
	// Give the service time to start
	time.Sleep(100 * time.Millisecond)
	
	// Cancel to stop the service
	cancel()
	
	// Check for errors
	select {
	case err := <-errCh:
		assert.NoError(t, err)
	case <-time.After(1 * time.Second):
		t.Fatal("Service did not stop in time")
	}
}

func TestDeviceValidation(t *testing.T) {
	tests := []struct {
		name    string
		device  models.Device
		wantErr bool
	}{
		{
			name: "valid sensor device",
			device: models.Device{
				DeviceID:   "test-sensor-01",
				DeviceType: "sensor",
				Name:       "Test Sensor",
				Capabilities: models.DeviceCapabilities{
					Sensors: []string{"temperature", "humidity"},
				},
			},
			wantErr: false,
		},
		{
			name: "valid switch device",
			device: models.Device{
				DeviceID:   "test-switch-01",
				DeviceType: "switch",
				Name:       "Test Switch",
				Capabilities: models.DeviceCapabilities{
					Actuators: []string{"relay"},
				},
			},
			wantErr: false,
		},
		{
			name: "missing device_id",
			device: models.Device{
				DeviceType: "sensor",
				Name:       "Test Device",
			},
			wantErr: true,
		},
		{
			name: "missing device_type",
			device: models.Device{
				DeviceID: "test-01",
				Name:     "Test Device",
			},
			wantErr: true,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.device.Validate()
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestDeviceAnnouncementParsing(t *testing.T) {
	announcement := models.DeviceAnnouncement{
		Device: models.Device{
			DeviceID:   "esp32-kitchen-001",
			DeviceType: "sensor",
			Name:       "Kitchen Sensor",
			Manufacturer: "DIY",
			Model:       "ESP32-BME280",
			Capabilities: models.DeviceCapabilities{
				Sensors: []string{"temperature", "humidity", "pressure"},
				Units: map[string]string{
					"temperature": "°C",
					"humidity":    "%",
					"pressure":    "hPa",
				},
			},
			Topics: models.DeviceTopics{
				State:   "home.devices.sensor.esp32-kitchen-001.state",
				Status:  "home.devices.sensor.esp32-kitchen-001.status",
				Command: "home.devices.sensor.esp32-kitchen-001.command",
			},
		},
		AnnouncedAt: time.Now(),
	}
	
	// Test marshaling
	data, err := json.Marshal(announcement)
	require.NoError(t, err)
	
	// Test unmarshaling
	var parsed models.DeviceAnnouncement
	err = json.Unmarshal(data, &parsed)
	require.NoError(t, err)
	
	assert.Equal(t, announcement.DeviceID, parsed.DeviceID)
	assert.Equal(t, announcement.DeviceType, parsed.DeviceType)
	assert.Equal(t, announcement.Name, parsed.Name)
	assert.Equal(t, announcement.Capabilities.Sensors, parsed.Capabilities.Sensors)
	assert.Equal(t, announcement.Topics.State, parsed.Topics.State)
}

func TestDeviceStateUpdate(t *testing.T) {
	state := models.DeviceState{
		DeviceID: "test-sensor-01",
		State: map[string]interface{}{
			"temperature": 22.5,
			"humidity":    65.0,
		},
		Attributes: map[string]interface{}{
			"battery": 85,
			"rssi":    -65,
		},
		Timestamp: time.Now(),
	}
	
	data, err := json.Marshal(state)
	require.NoError(t, err)
	
	var parsed models.DeviceState
	err = json.Unmarshal(data, &parsed)
	require.NoError(t, err)
	
	assert.Equal(t, state.DeviceID, parsed.DeviceID)
	assert.Equal(t, 22.5, parsed.State["temperature"])
	assert.Equal(t, 65.0, parsed.State["humidity"])
	assert.Equal(t, float64(85), parsed.Attributes["battery"])
}

func TestDeviceCommand(t *testing.T) {
	cmd := models.DeviceCommand{
		Command: "turn_on",
		Parameters: map[string]interface{}{
			"brightness": 75,
			"color": map[string]interface{}{
				"r": 255,
				"g": 128,
				"b": 0,
			},
		},
		RequestID: "req-123",
		Timestamp: time.Now(),
	}
	
	data, err := json.Marshal(cmd)
	require.NoError(t, err)
	
	var parsed models.DeviceCommand
	err = json.Unmarshal(data, &parsed)
	require.NoError(t, err)
	
	assert.Equal(t, cmd.Command, parsed.Command)
	assert.Equal(t, cmd.RequestID, parsed.RequestID)
	assert.Equal(t, float64(75), parsed.Parameters["brightness"])
	
	color := parsed.Parameters["color"].(map[string]interface{})
	assert.Equal(t, float64(255), color["r"])
	assert.Equal(t, float64(128), color["g"])
	assert.Equal(t, float64(0), color["b"])
}

func TestDeviceCommandResponse(t *testing.T) {
	resp := models.DeviceCommandResponse{
		Success:   true,
		RequestID: "req-123",
		State: map[string]interface{}{
			"on":         true,
			"brightness": 75,
		},
		Timestamp: time.Now(),
	}
	
	data, err := json.Marshal(resp)
	require.NoError(t, err)
	
	var parsed models.DeviceCommandResponse
	err = json.Unmarshal(data, &parsed)
	require.NoError(t, err)
	
	assert.True(t, parsed.Success)
	assert.Equal(t, resp.RequestID, parsed.RequestID)
	assert.Equal(t, true, parsed.State["on"])
	assert.Equal(t, float64(75), parsed.State["brightness"])
}

func TestSubjectGeneration(t *testing.T) {
	tests := []struct {
		deviceType string
		deviceID   string
		suffix     string
		expected   string
	}{
		{
			deviceType: "sensor",
			deviceID:   "kitchen-01",
			suffix:     "state",
			expected:   "home.devices.sensor.kitchen-01.state",
		},
		{
			deviceType: "switch",
			deviceID:   "bedroom-light",
			suffix:     "command",
			expected:   "home.devices.switch.bedroom-light.command",
		},
		{
			deviceType: "climate",
			deviceID:   "living-room-ac",
			suffix:     "status",
			expected:   "home.devices.climate.living-room-ac.status",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			subject := fmt.Sprintf("home.devices.%s.%s.%s", tt.deviceType, tt.deviceID, tt.suffix)
			assert.Equal(t, tt.expected, subject)
		})
	}
}

// Helper function to create a test NATS message
func createTestMessage(subject string, data []byte) *nats.Msg {
	return &nats.Msg{
		Subject: subject,
		Data:    data,
	}
}