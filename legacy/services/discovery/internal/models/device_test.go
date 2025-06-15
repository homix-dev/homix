package models_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/homix-dev/homix/services/discovery/internal/models"
)

func TestDevice_Validate(t *testing.T) {
	tests := []struct {
		name    string
		device  models.Device
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid device",
			device: models.Device{
				DeviceID:     "test-01",
				DeviceType:   "sensor",
				Name:         "Test Sensor",
				Manufacturer: "Test Inc",
				Model:        "TS-001",
			},
			wantErr: false,
		},
		{
			name: "missing device_id",
			device: models.Device{
				DeviceType: "sensor",
				Name:       "Test Sensor",
			},
			wantErr: true,
			errMsg:  "device_id is required",
		},
		{
			name: "missing device_type",
			device: models.Device{
				DeviceID: "test-02",
				Name:     "Test Device",
			},
			wantErr: true,
			errMsg:  "device_type is required",
		},
		{
			name: "name defaults to device_id",
			device: models.Device{
				DeviceID:   "test-03",
				DeviceType: "switch",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.device.Validate()
			if tt.wantErr {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.errMsg)
			} else {
				assert.NoError(t, err)
				// Check name defaulting
				if tt.name == "name defaults to device_id" {
					assert.Equal(t, tt.device.DeviceID, tt.device.Name)
				}
			}
		})
	}
}

func TestDevice_UpdateStatus(t *testing.T) {
	device := models.Device{
		DeviceID:   "test-01",
		DeviceType: "sensor",
		Name:       "Test Sensor",
	}

	// Test updating to online
	beforeUpdate := time.Now()
	device.UpdateStatus(true)
	assert.True(t, device.Status.Online)
	assert.WithinDuration(t, beforeUpdate, device.Status.LastSeen, time.Second)

	// Test updating to offline
	device.UpdateStatus(false)
	assert.False(t, device.Status.Online)
	assert.WithinDuration(t, time.Now(), device.Status.LastSeen, time.Second)
}

func TestDevice_Capabilities(t *testing.T) {
	device := models.Device{
		DeviceID:   "test-01",
		DeviceType: "sensor",
		Name:       "Test Sensor",
		Capabilities: models.DeviceCapabilities{
			Sensors:   []string{"temperature", "humidity"},
			Actuators: []string{"led"},
			Units: map[string]string{
				"temperature": "°C",
				"humidity":    "%",
			},
		},
	}

	// Test JSON marshaling
	data, err := json.Marshal(device.Capabilities)
	require.NoError(t, err)

	var caps models.DeviceCapabilities
	err = json.Unmarshal(data, &caps)
	require.NoError(t, err)
	assert.Equal(t, device.Capabilities, caps)
}

func TestDevice_ToJSON(t *testing.T) {
	now := time.Now()
	device := models.Device{
		DeviceID:     "test-01",
		DeviceType:   "sensor",
		Name:         "Test Sensor",
		Manufacturer: "Test Inc",
		Model:        "TS-001",
		Status: models.DeviceStatus{
			Online:       true,
			LastSeen:     now,
			RegisteredAt: now.Add(-time.Hour),
			Version:      "1.0.0",
		},
		Capabilities: models.DeviceCapabilities{
			Sensors: []string{"temperature"},
		},
	}

	data, err := device.ToJSON()
	require.NoError(t, err)

	// Unmarshal to verify
	var result map[string]interface{}
	err = json.Unmarshal(data, &result)
	require.NoError(t, err)

	assert.Equal(t, "test-01", result["device_id"])
	assert.Equal(t, "sensor", result["device_type"])
	assert.Equal(t, "Test Sensor", result["name"])
	assert.Equal(t, "Test Inc", result["manufacturer"])
	assert.Equal(t, "TS-001", result["model"])
	
	status := result["status"].(map[string]interface{})
	assert.Equal(t, true, status["online"])
	assert.NotNil(t, status["last_seen"])
}

func TestDevice_FromJSON(t *testing.T) {
	jsonData := `{
		"device_id": "test-01",
		"device_type": "switch",
		"name": "Test Switch",
		"manufacturer": "Test Inc",
		"model": "SW-001",
		"status": {
			"online": true,
			"version": "2.0.0"
		},
		"capabilities": {
			"actuators": ["relay"],
			"features": {"timer": true}
		},
		"topics": {
			"state": "home.devices.switch.test-01.state",
			"command": "home.devices.switch.test-01.command"
		}
	}`

	device, err := models.FromJSON([]byte(jsonData))
	require.NoError(t, err)

	assert.Equal(t, "test-01", device.DeviceID)
	assert.Equal(t, "switch", device.DeviceType)
	assert.Equal(t, "Test Switch", device.Name)
	assert.Equal(t, "Test Inc", device.Manufacturer)
	assert.Equal(t, "SW-001", device.Model)
	assert.True(t, device.Status.Online)
	assert.Equal(t, "2.0.0", device.Status.Version)
	assert.Equal(t, []string{"relay"}, device.Capabilities.Actuators)
	assert.Equal(t, "home.devices.switch.test-01.state", device.Topics.State)
	assert.Equal(t, "home.devices.switch.test-01.command", device.Topics.Command)
}

func TestDeviceAnnouncement(t *testing.T) {
	device := models.Device{
		DeviceID:   "test-01",
		DeviceType: "sensor",
		Name:       "Test Sensor",
	}

	announcement := models.DeviceAnnouncement{
		Device:      device,
		AnnouncedAt: time.Now(),
	}

	data, err := json.Marshal(announcement)
	require.NoError(t, err)

	var result models.DeviceAnnouncement
	err = json.Unmarshal(data, &result)
	require.NoError(t, err)

	assert.Equal(t, announcement.DeviceID, result.DeviceID)
	assert.WithinDuration(t, announcement.AnnouncedAt, result.AnnouncedAt, time.Second)
}

func TestDeviceCommand(t *testing.T) {
	cmd := models.DeviceCommand{
		Command: "set_brightness",
		Parameters: map[string]interface{}{
			"brightness": 75,
			"transition": 1000,
		},
		RequestID: "req-123",
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(cmd)
	require.NoError(t, err)

	var result models.DeviceCommand
	err = json.Unmarshal(data, &result)
	require.NoError(t, err)

	assert.Equal(t, cmd.Command, result.Command)
	assert.Equal(t, cmd.RequestID, result.RequestID)
	assert.Equal(t, 75, int(result.Parameters["brightness"].(float64)))
}

func TestDiagnostics(t *testing.T) {
	battery := 85
	rssi := -65
	uptime := int64(3600)
	freeMemory := 1024
	temp := 25.5

	diag := models.Diagnostics{
		Battery:      &battery,
		RSSI:         &rssi,
		Uptime:       &uptime,
		FreeMemory:   &freeMemory,
		Temperature:  &temp,
		ErrorCount:   5,
		RestartCount: 2,
	}

	data, err := json.Marshal(diag)
	require.NoError(t, err)

	var result models.Diagnostics
	err = json.Unmarshal(data, &result)
	require.NoError(t, err)

	assert.Equal(t, battery, *result.Battery)
	assert.Equal(t, rssi, *result.RSSI)
	assert.Equal(t, uptime, *result.Uptime)
	assert.Equal(t, freeMemory, *result.FreeMemory)
	assert.Equal(t, temp, *result.Temperature)
	assert.Equal(t, 5, result.ErrorCount)
	assert.Equal(t, 2, result.RestartCount)
}