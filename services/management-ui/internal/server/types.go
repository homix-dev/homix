package server

import (
	"time"
)

// Device represents a device in the system
type Device struct {
	ID           string                 `json:"id"`
	Name         string                 `json:"name"`
	Type         string                 `json:"type"`
	Manufacturer string                 `json:"manufacturer"`
	Model        string                 `json:"model"`
	State        map[string]interface{} `json:"state"`
	Config       map[string]interface{} `json:"config"`
	Online       bool                   `json:"online"`
	LastSeen     time.Time              `json:"last_seen"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}

// Automation represents an automation rule
type Automation struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Enabled     bool                   `json:"enabled"`
	Triggers    []Trigger              `json:"triggers"`
	Conditions  []Condition            `json:"conditions"`
	Actions     []Action               `json:"actions"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	LastRun     *time.Time             `json:"last_run,omitempty"`
	RunCount    int                    `json:"run_count"`
}

// Trigger represents an automation trigger
type Trigger struct {
	Type       string                 `json:"type"` // device_state, time, sun, mqtt, webhook
	DeviceID   string                 `json:"device_id,omitempty"`
	Attribute  string                 `json:"attribute,omitempty"`
	Value      interface{}            `json:"value,omitempty"`
	Operator   string                 `json:"operator,omitempty"` // eq, ne, gt, lt, gte, lte
	Additional map[string]interface{} `json:"additional,omitempty"`
}

// Condition represents an automation condition
type Condition struct {
	Type       string                 `json:"type"` // device_state, time, sun, template
	DeviceID   string                 `json:"device_id,omitempty"`
	Attribute  string                 `json:"attribute,omitempty"`
	Value      interface{}            `json:"value,omitempty"`
	Operator   string                 `json:"operator,omitempty"`
	Additional map[string]interface{} `json:"additional,omitempty"`
}

// Action represents an automation action
type Action struct {
	Type       string                 `json:"type"` // device_action, scene, notification, delay, script
	DeviceID   string                 `json:"device_id,omitempty"`
	Service    string                 `json:"service,omitempty"`
	Data       map[string]interface{} `json:"data,omitempty"`
	Additional map[string]interface{} `json:"additional,omitempty"`
}

// Scene represents a scene configuration
type Scene struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Description string              `json:"description"`
	Icon        string              `json:"icon"`
	Entities    []SceneEntity       `json:"entities"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
}

// SceneEntity represents a device state in a scene
type SceneEntity struct {
	DeviceID string                 `json:"device_id"`
	State    map[string]interface{} `json:"state"`
}

// User represents a user account
type User struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Role      string    `json:"role"` // admin, user, viewer
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	LastLogin time.Time `json:"last_login"`
}

// Event represents a system event
type Event struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Source    string                 `json:"source"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

// SystemInfo represents system information
type SystemInfo struct {
	Version       string    `json:"version"`
	StartTime     time.Time `json:"start_time"`
	DeviceCount   int       `json:"device_count"`
	AutomationCount int     `json:"automation_count"`
	SceneCount    int       `json:"scene_count"`
	EventCount    int64     `json:"event_count"`
	NATSConnected bool      `json:"nats_connected"`
	SystemHealth  string    `json:"system_health"`
}

// APIResponse represents a standard API response
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

// PaginatedResponse represents a paginated API response
type PaginatedResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Page    int         `json:"page"`
	PerPage int         `json:"per_page"`
	Total   int         `json:"total"`
	Pages   int         `json:"pages"`
}

// DeviceCommand represents a command to send to a device
type DeviceCommand struct {
	DeviceID string                 `json:"device_id"`
	Command  string                 `json:"command"`
	Data     map[string]interface{} `json:"data,omitempty"`
}

// AutomationTest represents a test request for an automation
type AutomationTest struct {
	AutomationID string                 `json:"automation_id"`
	TestData     map[string]interface{} `json:"test_data,omitempty"`
}

// ConfigUpdate represents a configuration update request
type ConfigUpdate struct {
	Section string                 `json:"section"`
	Data    map[string]interface{} `json:"data"`
}

// Dashboard represents dashboard configuration
type Dashboard struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	Layout    []DashboardCard `json:"layout"`
	Default   bool           `json:"default"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

// DashboardCard represents a card on the dashboard
type DashboardCard struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"` // device, graph, weather, scene, automation
	Title    string                 `json:"title"`
	Position Position               `json:"position"`
	Size     Size                   `json:"size"`
	Config   map[string]interface{} `json:"config"`
}

// Position represents x,y coordinates
type Position struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// Size represents width and height
type Size struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}