package monitor

import (
	"sync"
	"time"
)

// DeviceStatus represents the health status of a device
type DeviceStatus struct {
	DeviceID       string                 `json:"device_id"`
	DeviceType     string                 `json:"device_type"`
	Manufacturer   string                 `json:"manufacturer"`
	Model          string                 `json:"model"`
	LastSeen       time.Time              `json:"last_seen"`
	Online         bool                   `json:"online"`
	Battery        *float64               `json:"battery,omitempty"`
	LinkQuality    *int                   `json:"link_quality,omitempty"`
	Temperature    *float64               `json:"temperature,omitempty"`
	Humidity       *float64               `json:"humidity,omitempty"`
	State          map[string]interface{} `json:"state,omitempty"`
	Alerts         []Alert                `json:"alerts,omitempty"`
	UpdateCount    int64                  `json:"update_count"`
	FirstSeen      time.Time              `json:"first_seen"`
	mu             sync.RWMutex           `json:"-"`
}

// Alert represents a device alert
type Alert struct {
	Type      string    `json:"type"`
	Severity  string    `json:"severity"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// DashboardData represents the data sent to the dashboard
type DashboardData struct {
	Timestamp       time.Time                `json:"timestamp"`
	TotalDevices    int                      `json:"total_devices"`
	OnlineDevices   int                      `json:"online_devices"`
	OfflineDevices  int                      `json:"offline_devices"`
	BatteryWarnings int                      `json:"battery_warnings"`
	Devices         map[string]*DeviceStatus `json:"devices"`
	SystemHealth    SystemHealth             `json:"system_health"`
}

// SystemHealth represents overall system health
type SystemHealth struct {
	NATSConnected    bool      `json:"nats_connected"`
	LastUpdate       time.Time `json:"last_update"`
	MonitorUptime    string    `json:"monitor_uptime"`
	MessageRate      float64   `json:"message_rate"`
	ErrorRate        float64   `json:"error_rate"`
}

// WebSocketMessage represents a message sent over WebSocket
type WebSocketMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// DeviceFilter represents filtering options for devices
type DeviceFilter struct {
	DeviceType   string   `json:"device_type,omitempty"`
	Online       *bool    `json:"online,omitempty"`
	HasAlerts    *bool    `json:"has_alerts,omitempty"`
	BatteryBelow *float64 `json:"battery_below,omitempty"`
}

// HistoricalData represents historical metrics for a device
type HistoricalData struct {
	DeviceID  string      `json:"device_id"`
	Metric    string      `json:"metric"`
	Values    []DataPoint `json:"values"`
	TimeRange TimeRange   `json:"time_range"`
}

// DataPoint represents a single data point
type DataPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Value     float64   `json:"value"`
}

// TimeRange represents a time range for queries
type TimeRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// Summary provides system summary statistics
type Summary struct {
	DevicesByType     map[string]int    `json:"devices_by_type"`
	DevicesByStatus   map[string]int    `json:"devices_by_status"`
	AverageUptime     float64           `json:"average_uptime"`
	TotalAlerts       int               `json:"total_alerts"`
	AlertsByType      map[string]int    `json:"alerts_by_type"`
	BatteryStatistics BatteryStatistics `json:"battery_statistics"`
}

// BatteryStatistics provides battery-related statistics
type BatteryStatistics struct {
	AverageLevel  float64 `json:"average_level"`
	LowestLevel   float64 `json:"lowest_level"`
	DevicesBelow20 int     `json:"devices_below_20"`
	DevicesBelow50 int     `json:"devices_below_50"`
}