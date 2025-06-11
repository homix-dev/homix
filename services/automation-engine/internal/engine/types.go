package engine

import "time"

// Automation represents an automation rule
type Automation struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Enabled     bool        `json:"enabled"`
	Triggers    []Trigger   `json:"triggers"`
	Conditions  []Condition `json:"conditions"`
	Actions     []Action    `json:"actions"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
	LastRun     time.Time   `json:"last_run,omitempty"`
	RunCount    int         `json:"run_count"`
}

// Trigger represents an automation trigger
type Trigger struct {
	Type      string                 `json:"type"`
	DeviceID  string                 `json:"device_id,omitempty"`
	Attribute string                 `json:"attribute,omitempty"`
	Value     interface{}            `json:"value,omitempty"`
	Above     float64                `json:"above,omitempty"`
	Below     float64                `json:"below,omitempty"`
	Time      string                 `json:"time,omitempty"`
	Platform  string                 `json:"platform,omitempty"`
	Event     string                 `json:"event,omitempty"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

// Condition represents an automation condition
type Condition struct {
	Type      string      `json:"type"`
	DeviceID  string      `json:"device_id,omitempty"`
	Attribute string      `json:"attribute,omitempty"`
	Value     interface{} `json:"value,omitempty"`
	Above     float64     `json:"above,omitempty"`
	Below     float64     `json:"below,omitempty"`
	After     string      `json:"after,omitempty"`
	Before    string      `json:"before,omitempty"`
	Weekday   []string    `json:"weekday,omitempty"`
}

// Action represents an automation action
type Action struct {
	Type     string                 `json:"type"`
	DeviceID string                 `json:"device_id,omitempty"`
	Command  string                 `json:"command,omitempty"`
	Data     map[string]interface{} `json:"data,omitempty"`
	Scene    string                 `json:"scene,omitempty"`
	Delay    int                    `json:"delay,omitempty"` // seconds
	Service  string                 `json:"service,omitempty"`
}

// DeviceState represents the current state of a device
type DeviceState struct {
	DeviceID   string                 `json:"device_id"`
	Type       string                 `json:"type"`
	State      map[string]interface{} `json:"state"`
	Online     bool                   `json:"online"`
	LastUpdate time.Time              `json:"last_update"`
}