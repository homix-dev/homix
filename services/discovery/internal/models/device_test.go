package models_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/calmera/nats-home-automation/services/discovery/internal/models"
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
				ID:           "test-01",
				Type:         "sensor",
				Name:         "Test Sensor",
				Manufacturer: "Test Inc",
				Model:        "TS-001",
			},
			wantErr: false,
		},
		{
			name: "missing ID",
			device: models.Device{
				Type: "sensor",
				Name: "Test Sensor",
			},
			wantErr: true,
			errMsg:  "device ID is required",
		},
		{
			name: "missing type",
			device: models.Device{
				ID:   "test-02",
				Name: "Test Device",
			},
			wantErr: true,
			errMsg:  "device type is required",
		},
		{
			name: "missing name",
			device: models.Device{
				ID:   "test-03",
				Type: "switch",
			},
			wantErr: true,
			errMsg:  "device name is required",
		},
		{
			name: "invalid type",
			device: models.Device{
				ID:   "test-04",
				Type: "invalid_type",
				Name: "Test Device",
			},
			wantErr: true,
			errMsg:  "invalid device type",
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
			}
		})
	}
}

func TestDevice_UpdateStatus(t *testing.T) {
	device := models.Device{
		ID:     "test-01",
		Type:   "sensor",
		Name:   "Test Sensor",
		Status: models.DeviceStatusOffline,
	}

	// Test updating to online
	device.UpdateStatus(models.DeviceStatusOnline)
	assert.Equal(t, models.DeviceStatusOnline, device.Status)
	assert.NotNil(t, device.LastSeen)
	assert.WithinDuration(t, time.Now(), *device.LastSeen, time.Second)

	// Test updating to offline
	device.UpdateStatus(models.DeviceStatusOffline)
	assert.Equal(t, models.DeviceStatusOffline, device.Status)
}

func TestDevice_SetCapabilities(t *testing.T) {
	device := models.Device{
		ID:   "test-01",
		Type: "sensor",
		Name: "Test Sensor",
	}

	capabilities := map[string]interface{}{
		"sensors": []string{"temperature", "humidity"},
		"units": map[string]string{
			"temperature": "°C",
			"humidity":    "%",
		},
	}

	err := device.SetCapabilities(capabilities)
	require.NoError(t, err)
	assert.NotNil(t, device.Capabilities)

	// Verify capabilities were stored correctly
	var stored map[string]interface{}
	err = json.Unmarshal(device.Capabilities, &stored)
	require.NoError(t, err)
	assert.Equal(t, capabilities, stored)
}

func TestDevice_GetCapabilities(t *testing.T) {
	capabilities := map[string]interface{}{
		"commands": []string{"on", "off", "toggle"},
		"features": []string{"timer", "dimming"},
	}

	capData, _ := json.Marshal(capabilities)
	device := models.Device{
		ID:           "test-01",
		Type:         "switch",
		Name:         "Test Switch",
		Capabilities: capData,
	}

	result, err := device.GetCapabilities()
	require.NoError(t, err)
	assert.Equal(t, capabilities, result)
}

func TestDevice_MarshalJSON(t *testing.T) {
	now := time.Now()
	device := models.Device{
		ID:           "test-01",
		Type:         "sensor",
		Name:         "Test Sensor",
		Manufacturer: "Test Inc",
		Model:        "TS-001",
		Version:      "1.0.0",
		Status:       models.DeviceStatusOnline,
		LastSeen:     &now,
		Capabilities: json.RawMessage(`{"sensors":["temperature"]}`),
		Config:       json.RawMessage(`{"update_interval":30}`),
		CreatedAt:    now.Add(-time.Hour),
		UpdatedAt:    now,
	}

	data, err := json.Marshal(device)
	require.NoError(t, err)

	// Unmarshal to verify
	var result map[string]interface{}
	err = json.Unmarshal(data, &result)
	require.NoError(t, err)

	assert.Equal(t, "test-01", result["id"])
	assert.Equal(t, "sensor", result["type"])
	assert.Equal(t, "Test Sensor", result["name"])
	assert.Equal(t, "Test Inc", result["manufacturer"])
	assert.Equal(t, "TS-001", result["model"])
	assert.Equal(t, "1.0.0", result["version"])
	assert.Equal(t, "online", result["status"])
	assert.NotNil(t, result["last_seen"])
	assert.NotNil(t, result["capabilities"])
	assert.NotNil(t, result["config"])
}

func TestDevice_UnmarshalJSON(t *testing.T) {
	jsonData := `{
		"id": "test-01",
		"type": "switch",
		"name": "Test Switch",
		"manufacturer": "Test Inc",
		"model": "SW-001",
		"version": "2.0.0",
		"status": "online",
		"capabilities": {"commands": ["on", "off"]},
		"config": {"default_state": "off"}
	}`

	var device models.Device
	err := json.Unmarshal([]byte(jsonData), &device)
	require.NoError(t, err)

	assert.Equal(t, "test-01", device.ID)
	assert.Equal(t, "switch", device.Type)
	assert.Equal(t, "Test Switch", device.Name)
	assert.Equal(t, "Test Inc", device.Manufacturer)
	assert.Equal(t, "SW-001", device.Model)
	assert.Equal(t, "2.0.0", device.Version)
	assert.Equal(t, models.DeviceStatusOnline, device.Status)
	assert.NotNil(t, device.Capabilities)
	assert.NotNil(t, device.Config)
}

func TestDeviceStatus_String(t *testing.T) {
	tests := []struct {
		status models.DeviceStatus
		want   string
	}{
		{models.DeviceStatusOnline, "online"},
		{models.DeviceStatusOffline, "offline"},
		{models.DeviceStatusUnknown, "unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			assert.Equal(t, tt.want, tt.status.String())
		})
	}
}

func TestDevice_IsValidType(t *testing.T) {
	validTypes := []string{
		"sensor", "binary_sensor", "switch", "light",
		"climate", "cover", "fan", "lock",
	}

	for _, deviceType := range validTypes {
		device := models.Device{
			ID:   "test",
			Type: deviceType,
			Name: "Test",
		}
		assert.NoError(t, device.Validate(), "Type %s should be valid", deviceType)
	}

	// Test invalid type
	device := models.Device{
		ID:   "test",
		Type: "invalid_type",
		Name: "Test",
	}
	assert.Error(t, device.Validate())
}