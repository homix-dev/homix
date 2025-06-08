package client

import "time"

// Device represents a device in the system
type Device struct {
	DeviceID     string             `json:"device_id"`
	DeviceType   string             `json:"device_type"`
	Manufacturer string             `json:"manufacturer"`
	Model        string             `json:"model"`
	Name         string             `json:"name"`
	Capabilities DeviceCapabilities `json:"capabilities"`
	Topics       DeviceTopics       `json:"topics"`
	Status       DeviceStatus       `json:"status"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// DeviceCapabilities describes device capabilities
type DeviceCapabilities struct {
	Sensors    []string               `json:"sensors,omitempty"`
	Actuators  []string               `json:"actuators,omitempty"`
	Attributes []string               `json:"attributes,omitempty"`
	Units      map[string]string      `json:"units,omitempty"`
	Features   map[string]interface{} `json:"features,omitempty"`
}

// DeviceTopics contains NATS subjects
type DeviceTopics struct {
	State   string `json:"state,omitempty"`
	Command string `json:"command,omitempty"`
	Status  string `json:"status,omitempty"`
	Config  string `json:"config,omitempty"`
}

// DeviceStatus tracks device status
type DeviceStatus struct {
	Online       bool        `json:"online"`
	LastSeen     time.Time   `json:"last_seen"`
	RegisteredAt time.Time   `json:"registered_at"`
	Version      string      `json:"version,omitempty"`
	IPAddress    string      `json:"ip_address,omitempty"`
	Diagnostics  Diagnostics `json:"diagnostics,omitempty"`
}

// Diagnostics contains device health info
type Diagnostics struct {
	Battery      *int     `json:"battery,omitempty"`
	RSSI         *int     `json:"rssi,omitempty"`
	Uptime       *int64   `json:"uptime,omitempty"`
	FreeMemory   *int     `json:"free_memory,omitempty"`
	Temperature  *float64 `json:"temperature,omitempty"`
	ErrorCount   int      `json:"error_count,omitempty"`
	RestartCount int      `json:"restart_count,omitempty"`
}

// DeviceConfig represents device configuration
type DeviceConfig struct {
	DeviceID    string                 `json:"device_id"`
	Name        string                 `json:"name"`
	Location    string                 `json:"location,omitempty"`
	Enabled     bool                   `json:"enabled"`
	Settings    map[string]interface{} `json:"settings,omitempty"`
	Thresholds  map[string]Threshold   `json:"thresholds,omitempty"`
	Automations []AutomationRule       `json:"automations,omitempty"`
	UpdatedAt   time.Time              `json:"updated_at"`
	UpdatedBy   string                 `json:"updated_by,omitempty"`
	Version     int                    `json:"version"`
}

// Threshold defines alert thresholds
type Threshold struct {
	Min      *float64 `json:"min,omitempty"`
	Max      *float64 `json:"max,omitempty"`
	Unit     string   `json:"unit,omitempty"`
	Action   string   `json:"action,omitempty"`
	Cooldown int      `json:"cooldown,omitempty"`
}

// AutomationRule defines automation
type AutomationRule struct {
	ID        string                 `json:"id"`
	Name      string                 `json:"name"`
	Trigger   string                 `json:"trigger"`
	Condition map[string]interface{} `json:"condition,omitempty"`
	Action    map[string]interface{} `json:"action"`
	Enabled   bool                   `json:"enabled"`
}

// ConfigBackup represents a backup
type ConfigBackup struct {
	ID            string                   `json:"id"`
	Description   string                   `json:"description,omitempty"`
	DeviceConfigs map[string]DeviceConfig  `json:"device_configs"`
	SystemConfigs map[string]interface{}   `json:"system_configs"`
	CreatedAt     time.Time                `json:"created_at"`
	CreatedBy     string                   `json:"created_by,omitempty"`
	Size          int64                    `json:"size_bytes"`
}