package monitor

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
)

// Monitor handles device health monitoring
type Monitor struct {
	config       *Config
	natsConn     *nats.Conn
	devices      map[string]*DeviceStatus
	devicesMutex sync.RWMutex
	subscribers  map[string]chan DashboardData
	subMutex     sync.RWMutex
	logger       *logrus.Logger
	startTime    time.Time
	messageCount int64
	errorCount   int64
	server       *Server
}

// New creates a new monitor instance
func New(config *Config) (*Monitor, error) {
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)

	m := &Monitor{
		config:      config,
		devices:     make(map[string]*DeviceStatus),
		subscribers: make(map[string]chan DashboardData),
		logger:      logger,
		startTime:   time.Now(),
	}

	// Create server
	server, err := NewServer(config.HTTP, m)
	if err != nil {
		return nil, fmt.Errorf("failed to create server: %w", err)
	}
	m.server = server

	return m, nil
}

// Start starts the monitor
func (m *Monitor) Start(ctx context.Context) error {
	// Connect to NATS
	if err := m.connectNATS(); err != nil {
		return fmt.Errorf("failed to connect to NATS: %w", err)
	}
	defer m.natsConn.Close()

	// Start HTTP server
	go func() {
		if err := m.server.Start(); err != nil {
			m.logger.Errorf("HTTP server error: %v", err)
		}
	}()

	// Subscribe to device messages
	if err := m.subscribe(); err != nil {
		return fmt.Errorf("failed to subscribe: %w", err)
	}

	// Start monitoring loop
	go m.monitoringLoop(ctx)

	// Start cleanup loop
	go m.cleanupLoop(ctx)

	// Publish service started event
	m.publishEvent("service_started", map[string]interface{}{
		"service": "health-monitor",
		"version": "1.0.0",
	})

	// Wait for context cancellation
	<-ctx.Done()

	m.logger.Info("Shutting down monitor...")
	
	// Publish service stopped event
	m.publishEvent("service_stopped", map[string]interface{}{
		"service": "health-monitor",
	})
	
	return m.server.Stop(context.Background())
}

func (m *Monitor) connectNATS() error {
	opts := []nats.Option{
		nats.Name("health-monitor"),
		nats.ReconnectWait(time.Second),
		nats.MaxReconnects(-1),
		nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
			m.logger.Warnf("NATS disconnected: %v", err)
		}),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			m.logger.Info("NATS reconnected")
		}),
	}

	if m.config.NATS.Credentials != "" {
		opts = append(opts, nats.UserCredentials(m.config.NATS.Credentials))
	}

	conn, err := nats.Connect(m.config.NATS.URL, opts...)
	if err != nil {
		return err
	}

	m.natsConn = conn
	m.logger.Info("Connected to NATS server")
	return nil
}

func (m *Monitor) subscribe() error {
	// Subscribe to all device state updates
	sub, err := m.natsConn.Subscribe("home.devices.*.*.state", m.handleDeviceState)
	if err != nil {
		return err
	}
	m.logger.Infof("Subscribed to: %s", sub.Subject)

	// Subscribe to device announcements
	sub, err = m.natsConn.Subscribe("home.devices.*.*.announce", m.handleDeviceAnnounce)
	if err != nil {
		return err
	}
	m.logger.Infof("Subscribed to: %s", sub.Subject)

	// Subscribe to alerts
	sub, err = m.natsConn.Subscribe("home.*.alerts", m.handleAlert)
	if err != nil {
		return err
	}
	m.logger.Infof("Subscribed to: %s", sub.Subject)

	return nil
}

func (m *Monitor) handleDeviceState(msg *nats.Msg) {
	m.messageCount++

	// Parse subject to extract device info
	parts := strings.Split(msg.Subject, ".")
	if len(parts) < 5 {
		m.logger.Warnf("Invalid subject format: %s", msg.Subject)
		m.errorCount++
		return
	}

	deviceType := parts[2]
	deviceID := parts[3]

	// Parse message
	var state map[string]interface{}
	if err := json.Unmarshal(msg.Data, &state); err != nil {
		m.logger.Errorf("Failed to parse state message: %v", err)
		m.errorCount++
		return
	}

	// Update device status
	m.updateDeviceStatus(deviceID, deviceType, state)
}

func (m *Monitor) handleDeviceAnnounce(msg *nats.Msg) {
	// Parse subject
	parts := strings.Split(msg.Subject, ".")
	if len(parts) < 5 {
		return
	}

	deviceType := parts[2]
	deviceID := parts[3]

	// Parse announcement
	var announce map[string]interface{}
	if err := json.Unmarshal(msg.Data, &announce); err != nil {
		m.logger.Errorf("Failed to parse announcement: %v", err)
		return
	}

	// Create or update device
	m.devicesMutex.Lock()
	device, exists := m.devices[deviceID]
	if !exists {
		device = &DeviceStatus{
			DeviceID:   deviceID,
			DeviceType: deviceType,
			FirstSeen:  time.Now(),
			State:      make(map[string]interface{}),
		}
		m.devices[deviceID] = device
	}

	device.mu.Lock()
	if manufacturer, ok := announce["manufacturer"].(string); ok {
		device.Manufacturer = manufacturer
	}
	if model, ok := announce["model"].(string); ok {
		device.Model = model
	}
	device.mu.Unlock()

	m.devicesMutex.Unlock()
	m.logger.Infof("Device announced: %s (%s)", deviceID, deviceType)
}

func (m *Monitor) handleAlert(msg *nats.Msg) {
	// Parse alert
	var alert map[string]interface{}
	if err := json.Unmarshal(msg.Data, &alert); err != nil {
		m.logger.Errorf("Failed to parse alert: %v", err)
		return
	}

	// Extract device ID
	deviceID, ok := alert["device_id"].(string)
	if !ok {
		return
	}

	// Create alert
	alertType, _ := alert["alert"].(string)
	severity, _ := alert["severity"].(string)
	message := fmt.Sprintf("%v", alert)

	newAlert := Alert{
		Type:      alertType,
		Severity:  severity,
		Message:   message,
		Timestamp: time.Now(),
	}

	// Add alert to device
	m.devicesMutex.RLock()
	device, exists := m.devices[deviceID]
	m.devicesMutex.RUnlock()

	if exists {
		device.mu.Lock()
		device.Alerts = append(device.Alerts, newAlert)
		// Keep only last 10 alerts
		if len(device.Alerts) > 10 {
			device.Alerts = device.Alerts[len(device.Alerts)-10:]
		}
		device.mu.Unlock()
	}
}

func (m *Monitor) updateDeviceStatus(deviceID, deviceType string, state map[string]interface{}) {
	m.devicesMutex.Lock()
	device, exists := m.devices[deviceID]
	if !exists {
		device = &DeviceStatus{
			DeviceID:   deviceID,
			DeviceType: deviceType,
			FirstSeen:  time.Now(),
			State:      make(map[string]interface{}),
		}
		m.devices[deviceID] = device
	}
	m.devicesMutex.Unlock()

	device.mu.Lock()
	defer device.mu.Unlock()

	device.LastSeen = time.Now()
	device.Online = true
	device.UpdateCount++

	// Update specific fields
	if battery, ok := state["battery"].(float64); ok {
		device.Battery = &battery
		// Check for low battery
		if battery < 20 {
			device.Alerts = append(device.Alerts, Alert{
				Type:      "low_battery",
				Severity:  "warning",
				Message:   fmt.Sprintf("Battery level: %.0f%%", battery),
				Timestamp: time.Now(),
			})
		}
	}

	if linkQuality, ok := state["link_quality"].(float64); ok {
		lq := int(linkQuality)
		device.LinkQuality = &lq
	}

	if temp, ok := state["temperature"].(float64); ok {
		device.Temperature = &temp
	}

	if humidity, ok := state["humidity"].(float64); ok {
		device.Humidity = &humidity
	}

	// Store full state
	device.State = state
}

func (m *Monitor) monitoringLoop(ctx context.Context) {
	ticker := time.NewTicker(m.config.Monitor.UpdateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.broadcastStatus()
		}
	}
}

func (m *Monitor) cleanupLoop(ctx context.Context) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.checkOfflineDevices()
		}
	}
}

func (m *Monitor) checkOfflineDevices() {
	now := time.Now()
	m.devicesMutex.RLock()
	defer m.devicesMutex.RUnlock()

	for _, device := range m.devices {
		device.mu.Lock()
		if device.Online && now.Sub(device.LastSeen) > m.config.Monitor.DeviceTimeout {
			device.Online = false
			device.Alerts = append(device.Alerts, Alert{
				Type:      "device_offline",
				Severity:  "error",
				Message:   fmt.Sprintf("Device offline for %v", now.Sub(device.LastSeen).Round(time.Minute)),
				Timestamp: now,
			})
			m.logger.Warnf("Device %s is offline", device.DeviceID)
		}
		device.mu.Unlock()
	}
}

func (m *Monitor) broadcastStatus() {
	data := m.GetDashboardData()
	
	m.subMutex.RLock()
	defer m.subMutex.RUnlock()

	for id, ch := range m.subscribers {
		select {
		case ch <- data:
		default:
			m.logger.Warnf("Subscriber %s channel full, skipping update", id)
		}
	}
}

// GetDashboardData returns current dashboard data
func (m *Monitor) GetDashboardData() DashboardData {
	m.devicesMutex.RLock()
	defer m.devicesMutex.RUnlock()

	data := DashboardData{
		Timestamp:    time.Now(),
		TotalDevices: len(m.devices),
		Devices:      make(map[string]*DeviceStatus),
		SystemHealth: SystemHealth{
			NATSConnected: m.natsConn != nil && m.natsConn.IsConnected(),
			LastUpdate:    time.Now(),
			MonitorUptime: time.Since(m.startTime).String(),
			MessageRate:   float64(m.messageCount) / time.Since(m.startTime).Seconds(),
			ErrorRate:     float64(m.errorCount) / time.Since(m.startTime).Seconds(),
		},
	}

	// Copy device data
	for id, device := range m.devices {
		device.mu.RLock()
		deviceCopy := &DeviceStatus{
			DeviceID:     device.DeviceID,
			DeviceType:   device.DeviceType,
			Manufacturer: device.Manufacturer,
			Model:        device.Model,
			LastSeen:     device.LastSeen,
			Online:       device.Online,
			Battery:      device.Battery,
			LinkQuality:  device.LinkQuality,
			Temperature:  device.Temperature,
			Humidity:     device.Humidity,
			State:        device.State,
			Alerts:       device.Alerts,
			UpdateCount:  device.UpdateCount,
			FirstSeen:    device.FirstSeen,
		}
		device.mu.RUnlock()

		data.Devices[id] = deviceCopy

		if deviceCopy.Online {
			data.OnlineDevices++
		} else {
			data.OfflineDevices++
		}

		if deviceCopy.Battery != nil && *deviceCopy.Battery < 20 {
			data.BatteryWarnings++
		}
	}

	return data
}

// Subscribe adds a new dashboard subscriber
func (m *Monitor) Subscribe(id string) chan DashboardData {
	m.subMutex.Lock()
	defer m.subMutex.Unlock()

	ch := make(chan DashboardData, 10)
	m.subscribers[id] = ch
	return ch
}

// Unsubscribe removes a dashboard subscriber
func (m *Monitor) Unsubscribe(id string) {
	m.subMutex.Lock()
	defer m.subMutex.Unlock()

	if ch, exists := m.subscribers[id]; exists {
		close(ch)
		delete(m.subscribers, id)
	}
}

// GetDeviceSummary returns a summary of devices
func (m *Monitor) GetDeviceSummary() Summary {
	m.devicesMutex.RLock()
	defer m.devicesMutex.RUnlock()

	summary := Summary{
		DevicesByType:   make(map[string]int),
		DevicesByStatus: make(map[string]int),
		AlertsByType:    make(map[string]int),
	}

	var totalUptime float64
	var batterySum float64
	var batteryCount int
	var lowestBattery float64 = 100

	for _, device := range m.devices {
		device.mu.RLock()

		// Count by type
		summary.DevicesByType[device.DeviceType]++

		// Count by status
		if device.Online {
			summary.DevicesByStatus["online"]++
		} else {
			summary.DevicesByStatus["offline"]++
		}

		// Calculate uptime
		if device.Online {
			uptime := time.Since(device.FirstSeen).Hours()
			totalUptime += uptime
		}

		// Battery statistics
		if device.Battery != nil {
			batterySum += *device.Battery
			batteryCount++
			if *device.Battery < lowestBattery {
				lowestBattery = *device.Battery
			}
			if *device.Battery < 20 {
				summary.BatteryStatistics.DevicesBelow20++
			}
			if *device.Battery < 50 {
				summary.BatteryStatistics.DevicesBelow50++
			}
		}

		// Count alerts
		for _, alert := range device.Alerts {
			summary.AlertsByType[alert.Type]++
			summary.TotalAlerts++
		}

		device.mu.RUnlock()
	}

	// Calculate averages
	if len(m.devices) > 0 {
		summary.AverageUptime = totalUptime / float64(len(m.devices))
	}
	if batteryCount > 0 {
		summary.BatteryStatistics.AverageLevel = batterySum / float64(batteryCount)
		summary.BatteryStatistics.LowestLevel = lowestBattery
	}

	return summary
}

// publishEvent publishes a system event
func (m *Monitor) publishEvent(eventType string, data interface{}) {
	event := map[string]interface{}{
		"timestamp":  time.Now().Format(time.RFC3339),
		"event_type": eventType,
		"data":       data,
	}
	payload, _ := json.Marshal(event)
	m.natsConn.Publish(fmt.Sprintf("home.events.system.%s", eventType), payload)
}