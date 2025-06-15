package models

import (
	"encoding/json"
	"fmt"
	"time"
)

// Device represents a device in the home automation system
type Device struct {
	// Core identification
	DeviceID     string `json:"device_id"`
	DeviceType   string `json:"device_type"`
	Manufacturer string `json:"manufacturer"`
	Model        string `json:"model"`
	Name         string `json:"name"`

	// Capabilities
	Capabilities DeviceCapabilities `json:"capabilities"`

	// NATS topics
	Topics DeviceTopics `json:"topics"`

	// Status tracking
	Status DeviceStatus `json:"status"`

	// Metadata
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// DeviceCapabilities describes what the device can do
type DeviceCapabilities struct {
	Sensors    []string               `json:"sensors,omitempty"`
	Actuators  []string               `json:"actuators,omitempty"`
	Attributes []string               `json:"attributes,omitempty"`
	Units      map[string]string      `json:"units,omitempty"`
	Features   map[string]interface{} `json:"features,omitempty"`
}

// DeviceTopics contains NATS subjects for device communication
type DeviceTopics struct {
	State   string `json:"state,omitempty"`
	Command string `json:"command,omitempty"`
	Status  string `json:"status,omitempty"`
	Config  string `json:"config,omitempty"`
}

// DeviceStatus tracks device health and connectivity
type DeviceStatus struct {
	Online       bool       `json:"online"`
	LastSeen     time.Time  `json:"last_seen"`
	RegisteredAt time.Time  `json:"registered_at"`
	Version      string     `json:"version,omitempty"`
	IPAddress    string     `json:"ip_address,omitempty"`
	Diagnostics  Diagnostics `json:"diagnostics,omitempty"`
}

// Diagnostics contains device health information
type Diagnostics struct {
	Battery      *int    `json:"battery,omitempty"`      // Battery percentage (0-100)
	RSSI         *int    `json:"rssi,omitempty"`         // WiFi signal strength
	Uptime       *int64  `json:"uptime,omitempty"`       // Uptime in seconds
	FreeMemory   *int    `json:"free_memory,omitempty"`  // Free memory in bytes
	Temperature  *float64 `json:"temperature,omitempty"`  // Device temperature
	ErrorCount   int     `json:"error_count,omitempty"`
	RestartCount int     `json:"restart_count,omitempty"`
}

// DeviceAnnouncement is sent when a device comes online
type DeviceAnnouncement struct {
	Device
	AnnouncedAt time.Time `json:"announced_at"`
}

// DeviceCommand represents a command sent to a device
type DeviceCommand struct {
	Command    string                 `json:"command"`
	Parameters map[string]interface{} `json:"parameters,omitempty"`
	RequestID  string                 `json:"request_id,omitempty"`
	Timestamp  time.Time             `json:"timestamp"`
}

// DeviceCommandResponse is the response to a command
type DeviceCommandResponse struct {
	Success   bool                   `json:"success"`
	RequestID string                 `json:"request_id,omitempty"`
	State     map[string]interface{} `json:"state,omitempty"`
	Error     string                 `json:"error,omitempty"`
	Timestamp time.Time             `json:"timestamp"`
}

// DeviceState represents the current state of a device
type DeviceState struct {
	DeviceID   string                 `json:"device_id"`
	State      map[string]interface{} `json:"state"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
	Timestamp  time.Time             `json:"timestamp"`
}

// Validate checks if the device data is valid
func (d *Device) Validate() error {
	if d.DeviceID == "" {
		return fmt.Errorf("device_id is required")
	}
	if d.DeviceType == "" {
		return fmt.Errorf("device_type is required")
	}
	if d.Name == "" {
		d.Name = d.DeviceID
	}
	return nil
}

// UpdateStatus updates the device status
func (d *Device) UpdateStatus(online bool) {
	d.Status.Online = online
	d.Status.LastSeen = time.Now()
}

// ToJSON converts the device to JSON
func (d *Device) ToJSON() ([]byte, error) {
	return json.Marshal(d)
}

// FromJSON creates a device from JSON
func FromJSON(data []byte) (*Device, error) {
	var device Device
	err := json.Unmarshal(data, &device)
	return &device, err
}