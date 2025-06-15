package models

import (
	"encoding/json"
	"fmt"
	"time"
)

// DeviceConfig represents device-specific configuration
type DeviceConfig struct {
	DeviceID    string                 `json:"device_id"`
	Name        string                 `json:"name"`
	Location    string                 `json:"location,omitempty"`
	Enabled     bool                   `json:"enabled"`
	Settings    map[string]interface{} `json:"settings,omitempty"`
	Thresholds  map[string]Threshold   `json:"thresholds,omitempty"`
	Automations []AutomationRule       `json:"automations,omitempty"`
	UpdatedAt   time.Time             `json:"updated_at"`
	UpdatedBy   string                 `json:"updated_by,omitempty"`
	Version     int                    `json:"version"`
}

// Threshold defines alert thresholds for sensors
type Threshold struct {
	Min      *float64 `json:"min,omitempty"`
	Max      *float64 `json:"max,omitempty"`
	Unit     string   `json:"unit,omitempty"`
	Action   string   `json:"action,omitempty"`   // What to do when threshold is crossed
	Cooldown int      `json:"cooldown,omitempty"` // Seconds before re-triggering
}

// AutomationRule defines device-specific automation
type AutomationRule struct {
	ID        string                 `json:"id"`
	Name      string                 `json:"name"`
	Trigger   string                 `json:"trigger"`   // e.g., "state_change", "schedule"
	Condition map[string]interface{} `json:"condition,omitempty"`
	Action    map[string]interface{} `json:"action"`
	Enabled   bool                   `json:"enabled"`
}

// SystemConfig represents system-wide configuration
type SystemConfig struct {
	Component   string                 `json:"component"`
	Settings    map[string]interface{} `json:"settings"`
	UpdatedAt   time.Time             `json:"updated_at"`
	UpdatedBy   string                 `json:"updated_by,omitempty"`
	Version     int                    `json:"version"`
}

// ConfigSchema defines validation schema for configurations
type ConfigSchema struct {
	DeviceType  string                    `json:"device_type"`
	Fields      map[string]FieldSchema    `json:"fields"`
	Required    []string                  `json:"required,omitempty"`
	Constraints map[string]interface{}    `json:"constraints,omitempty"`
}

// FieldSchema defines a configuration field
type FieldSchema struct {
	Type        string      `json:"type"` // string, number, boolean, object, array
	Description string      `json:"description,omitempty"`
	Default     interface{} `json:"default,omitempty"`
	Min         *float64    `json:"min,omitempty"`
	Max         *float64    `json:"max,omitempty"`
	Enum        []string    `json:"enum,omitempty"`
	Pattern     string      `json:"pattern,omitempty"` // Regex pattern for strings
	Required    bool        `json:"required,omitempty"`
}

// ConfigBackup represents a configuration backup
type ConfigBackup struct {
	ID           string                   `json:"id"`
	Description  string                   `json:"description,omitempty"`
	DeviceConfigs map[string]DeviceConfig `json:"device_configs"`
	SystemConfigs map[string]SystemConfig `json:"system_configs"`
	CreatedAt    time.Time               `json:"created_at"`
	CreatedBy    string                  `json:"created_by,omitempty"`
	Size         int64                   `json:"size_bytes"`
}

// NewDeviceConfig creates a new device configuration with defaults
func NewDeviceConfig(deviceID string) *DeviceConfig {
	return &DeviceConfig{
		DeviceID:  deviceID,
		Enabled:   true,
		Settings:  make(map[string]interface{}),
		UpdatedAt: time.Now(),
		Version:   1,
	}
}

// Validate checks if the device config is valid
func (dc *DeviceConfig) Validate() error {
	if dc.DeviceID == "" {
		return fmt.Errorf("device_id is required")
	}
	if dc.Name == "" {
		dc.Name = dc.DeviceID
	}
	return nil
}

// ApplyDefaults applies default values based on device type
func (dc *DeviceConfig) ApplyDefaults(deviceType string) {
	switch deviceType {
	case "sensor":
		if dc.Settings["update_interval"] == nil {
			dc.Settings["update_interval"] = 60 // seconds
		}
		if dc.Settings["retain_history"] == nil {
			dc.Settings["retain_history"] = true
		}
	case "switch":
		if dc.Settings["default_state"] == nil {
			dc.Settings["default_state"] = "off"
		}
		if dc.Settings["state_memory"] == nil {
			dc.Settings["state_memory"] = true // Remember state after power loss
		}
	case "light":
		if dc.Settings["transition_time"] == nil {
			dc.Settings["transition_time"] = 1.0 // seconds
		}
		if dc.Settings["min_brightness"] == nil {
			dc.Settings["min_brightness"] = 1
		}
		if dc.Settings["max_brightness"] == nil {
			dc.Settings["max_brightness"] = 100
		}
	}
}

// ToJSON converts config to JSON
func (dc *DeviceConfig) ToJSON() ([]byte, error) {
	return json.Marshal(dc)
}

// GetDefaultSchemas returns default configuration schemas for common device types
func GetDefaultSchemas() map[string]ConfigSchema {
	return map[string]ConfigSchema{
		"sensor": {
			DeviceType: "sensor",
			Fields: map[string]FieldSchema{
				"update_interval": {
					Type:        "number",
					Description: "How often to report state (seconds)",
					Default:     60,
					Min:         floatPtr(1),
					Max:         floatPtr(3600),
				},
				"retain_history": {
					Type:        "boolean",
					Description: "Whether to retain historical data",
					Default:     true,
				},
				"calibration_offset": {
					Type:        "number",
					Description: "Calibration offset for sensor readings",
					Default:     0,
					Min:         floatPtr(-100),
					Max:         floatPtr(100),
				},
			},
		},
		"switch": {
			DeviceType: "switch",
			Fields: map[string]FieldSchema{
				"default_state": {
					Type:        "string",
					Description: "Default state on power up",
					Default:     "off",
					Enum:        []string{"on", "off", "last"},
				},
				"state_memory": {
					Type:        "boolean",
					Description: "Remember state after power loss",
					Default:     true,
				},
				"invert_state": {
					Type:        "boolean",
					Description: "Invert the switch state",
					Default:     false,
				},
			},
		},
		"light": {
			DeviceType: "light",
			Fields: map[string]FieldSchema{
				"transition_time": {
					Type:        "number",
					Description: "Default transition time in seconds",
					Default:     1.0,
					Min:         floatPtr(0),
					Max:         floatPtr(10),
				},
				"min_brightness": {
					Type:        "number",
					Description: "Minimum brightness level",
					Default:     1,
					Min:         floatPtr(1),
					Max:         floatPtr(100),
				},
				"max_brightness": {
					Type:        "number",
					Description: "Maximum brightness level",
					Default:     100,
					Min:         floatPtr(1),
					Max:         floatPtr(100),
				},
				"color_temp_min": {
					Type:        "number",
					Description: "Minimum color temperature (Kelvin)",
					Default:     2700,
					Min:         floatPtr(1000),
					Max:         floatPtr(10000),
				},
				"color_temp_max": {
					Type:        "number",
					Description: "Maximum color temperature (Kelvin)",
					Default:     6500,
					Min:         floatPtr(1000),
					Max:         floatPtr(10000),
				},
			},
		},
	}
}

// Helper function to create float64 pointer
func floatPtr(f float64) *float64 {
	return &f
}