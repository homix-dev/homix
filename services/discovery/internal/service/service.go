package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/calmera/nats-home-automation/services/discovery/internal/config"
	"github.com/calmera/nats-home-automation/services/discovery/internal/configmgr"
	"github.com/calmera/nats-home-automation/services/discovery/internal/models"
	"github.com/calmera/nats-home-automation/services/discovery/internal/registry"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/sirupsen/logrus"
)

// Service is the device discovery service
type Service struct {
	config    *config.Config
	log       *logrus.Logger
	nc        *nats.Conn
	js        jetstream.JetStream
	registry  *registry.Registry
	configMgr *configmgr.Manager
	subs      []*nats.Subscription
}

// New creates a new discovery service
func New(cfg *config.Config, log *logrus.Logger) (*Service, error) {
	return &Service{
		config: cfg,
		log:    log,
		subs:   make([]*nats.Subscription, 0),
	}, nil
}

// Run starts the discovery service
func (s *Service) Run(ctx context.Context) error {
	// Connect to NATS
	if err := s.connect(); err != nil {
		return fmt.Errorf("failed to connect to NATS: %w", err)
	}
	defer s.close()

	// Initialize registry
	reg, err := registry.New(s.js, s.config.Store.Bucket, s.log)
	if err != nil {
		return fmt.Errorf("failed to initialize registry: %w", err)
	}
	s.registry = reg

	// Initialize configuration manager
	cfgMgr, err := configmgr.New(s.js, s.log)
	if err != nil {
		return fmt.Errorf("failed to initialize config manager: %w", err)
	}
	s.configMgr = cfgMgr

	// Setup subscriptions
	if err := s.setupSubscriptions(); err != nil {
		return fmt.Errorf("failed to setup subscriptions: %w", err)
	}

	// Start health check responder
	if err := s.startHealthCheck(); err != nil {
		return fmt.Errorf("failed to start health check: %w", err)
	}

	// Start device status monitor
	go s.monitorDeviceStatus(ctx)

	// Log startup
	s.log.Info("Discovery service started")
	s.publishEvent("service_started", map[string]interface{}{
		"service": "discovery",
		"version": "1.0.0",
	})

	// Wait for shutdown
	<-ctx.Done()

	s.log.Info("Discovery service shutting down")
	s.publishEvent("service_stopped", map[string]interface{}{
		"service": "discovery",
	})

	return nil
}

// connect establishes connection to NATS
func (s *Service) connect() error {
	opts := []nats.Option{
		nats.Name("discovery-service"),
		nats.MaxReconnects(-1),
		nats.ReconnectWait(time.Second),
		nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
			s.log.Warnf("Disconnected from NATS: %v", err)
		}),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			s.log.Info("Reconnected to NATS")
		}),
		nats.ErrorHandler(func(nc *nats.Conn, sub *nats.Subscription, err error) {
			s.log.Errorf("NATS error: %v", err)
		}),
	}

	// Add authentication
	if s.config.NATS.Credentials != "" {
		opts = append(opts, nats.UserCredentials(s.config.NATS.Credentials))
	} else if s.config.NATS.User != "" && s.config.NATS.Password != "" {
		opts = append(opts, nats.UserInfo(s.config.NATS.User, s.config.NATS.Password))
	}

	// Connect
	nc, err := nats.Connect(s.config.NATS.URL, opts...)
	if err != nil {
		return err
	}

	// Get JetStream context
	js, err := jetstream.New(nc)
	if err != nil {
		nc.Close()
		return err
	}

	s.nc = nc
	s.js = js
	return nil
}

// close cleanly shuts down the service
func (s *Service) close() {
	// Unsubscribe all
	for _, sub := range s.subs {
		sub.Unsubscribe()
	}

	// Close connection
	if s.nc != nil {
		s.nc.Close()
	}
}

// setupSubscriptions sets up all NATS subscriptions
func (s *Service) setupSubscriptions() error {
	// Device announcement handler
	sub1, err := s.nc.Subscribe("home.discovery.announce", s.handleDeviceAnnouncement)
	if err != nil {
		return err
	}
	s.subs = append(s.subs, sub1)

	// Discovery request handler
	sub2, err := s.nc.Subscribe("home.discovery.request", s.handleDiscoveryRequest)
	if err != nil {
		return err
	}
	s.subs = append(s.subs, sub2)

	// Device status updates
	sub3, err := s.nc.Subscribe("home.devices.*.*.status", s.handleDeviceStatus)
	if err != nil {
		return err
	}
	s.subs = append(s.subs, sub3)

	// Service commands
	sub4, err := s.nc.Subscribe("home.services.discovery.command", s.handleServiceCommand)
	if err != nil {
		return err
	}
	s.subs = append(s.subs, sub4)

	// Configuration requests
	sub5, err := s.nc.Subscribe("home.config.device.*", s.handleConfigRequest)
	if err != nil {
		return err
	}
	s.subs = append(s.subs, sub5)

	// Configuration commands
	sub6, err := s.nc.Subscribe("home.services.config.command", s.handleConfigCommand)
	if err != nil {
		return err
	}
	s.subs = append(s.subs, sub6)

	s.log.Infof("Setup %d subscriptions", len(s.subs))
	return nil
}

// handleDeviceAnnouncement processes device announcements
func (s *Service) handleDeviceAnnouncement(msg *nats.Msg) {
	var announcement models.DeviceAnnouncement
	if err := json.Unmarshal(msg.Data, &announcement); err != nil {
		s.log.Errorf("Failed to unmarshal announcement: %v", err)
		return
	}

	// Set announcement time
	announcement.AnnouncedAt = time.Now()

	// Register device
	if err := s.registry.Register(&announcement.Device); err != nil {
		s.log.Errorf("Failed to register device %s: %v", announcement.DeviceID, err)
		return
	}

	// Publish device registered event
	s.publishEvent("device_registered", map[string]interface{}{
		"device_id":   announcement.DeviceID,
		"device_type": announcement.DeviceType,
		"name":        announcement.Name,
	})

	s.log.Infof("Device announced: %s (%s)", announcement.DeviceID, announcement.Name)
}

// handleDiscoveryRequest handles requests to list devices
func (s *Service) handleDiscoveryRequest(msg *nats.Msg) {
	// Parse request (could include filters)
	var request struct {
		DeviceType string `json:"device_type,omitempty"`
		Online     *bool  `json:"online,omitempty"`
	}
	if len(msg.Data) > 0 {
		json.Unmarshal(msg.Data, &request)
	}

	// Get devices
	var devices []*models.Device
	var err error

	if request.DeviceType != "" {
		devices, err = s.registry.ListByType(request.DeviceType)
	} else {
		devices, err = s.registry.List()
	}

	if err != nil {
		s.log.Errorf("Failed to list devices: %v", err)
		if msg.Reply != "" {
			s.nc.Publish(msg.Reply, []byte(`{"error":"failed to list devices"}`))
		}
		return
	}

	// Filter by online status if requested
	if request.Online != nil {
		filtered := make([]*models.Device, 0)
		for _, device := range devices {
			if device.Status.Online == *request.Online {
				filtered = append(filtered, device)
			}
		}
		devices = filtered
	}

	// Send response
	response := map[string]interface{}{
		"devices": devices,
		"count":   len(devices),
	}

	data, _ := json.Marshal(response)
	if msg.Reply != "" {
		s.nc.Publish(msg.Reply, data)
	}
}

// handleDeviceStatus processes device status updates
func (s *Service) handleDeviceStatus(msg *nats.Msg) {
	// Extract device ID from subject
	// Subject format: home.devices.{type}.{id}.status
	parts := strings.Split(msg.Subject, ".")
	if len(parts) < 4 {
		return
	}
	deviceID := parts[3]

	// Parse status
	var status struct {
		Online      bool                `json:"online"`
		Diagnostics models.Diagnostics `json:"diagnostics,omitempty"`
	}
	if err := json.Unmarshal(msg.Data, &status); err != nil {
		s.log.Errorf("Failed to unmarshal status: %v", err)
		return
	}

	// Update device status
	if err := s.registry.UpdateStatus(deviceID, status.Online); err != nil {
		s.log.Debugf("Failed to update status for %s: %v", deviceID, err)
	}
}

// handleServiceCommand handles commands sent to the discovery service
func (s *Service) handleServiceCommand(msg *nats.Msg) {
	var command struct {
		Command string                 `json:"command"`
		Params  map[string]interface{} `json:"params,omitempty"`
	}

	if err := json.Unmarshal(msg.Data, &command); err != nil {
		s.respondError(msg, "invalid command format")
		return
	}

	switch command.Command {
	case "get_device":
		deviceID, ok := command.Params["device_id"].(string)
		if !ok {
			s.respondError(msg, "device_id required")
			return
		}
		device, err := s.registry.Get(deviceID)
		if err != nil {
			s.respondError(msg, err.Error())
			return
		}
		s.respondJSON(msg, device)

	case "delete_device":
		deviceID, ok := command.Params["device_id"].(string)
		if !ok {
			s.respondError(msg, "device_id required")
			return
		}
		if err := s.registry.Delete(deviceID); err != nil {
			s.respondError(msg, err.Error())
			return
		}
		s.respondJSON(msg, map[string]interface{}{"success": true})

	case "get_stats":
		stats := s.registry.GetStats()
		s.respondJSON(msg, stats)

	default:
		s.respondError(msg, "unknown command")
	}
}

// startHealthCheck starts the health check responder
func (s *Service) startHealthCheck() error {
	sub, err := s.nc.Subscribe("home.services.discovery.status", func(msg *nats.Msg) {
		stats := s.registry.GetStats()
		response := map[string]interface{}{
			"service":   "discovery",
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"stats":     stats,
		}
		data, _ := json.Marshal(response)
		msg.Respond(data)
	})

	if err != nil {
		return err
	}

	s.subs = append(s.subs, sub)
	return nil
}

// monitorDeviceStatus periodically checks device status
func (s *Service) monitorDeviceStatus(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			devices, err := s.registry.List()
			if err != nil {
				s.log.Errorf("Failed to list devices for monitoring: %v", err)
				continue
			}

			now := time.Now()
			for _, device := range devices {
				// Mark offline if not seen recently
				if device.Status.Online && now.Sub(device.Status.LastSeen) > 2*time.Minute {
					s.registry.UpdateStatus(device.DeviceID, false)
					s.publishEvent("device_offline", map[string]interface{}{
						"device_id": device.DeviceID,
						"last_seen": device.Status.LastSeen,
					})
				}
			}
		}
	}
}

// Helper methods

func (s *Service) publishEvent(eventType string, data interface{}) {
	event := map[string]interface{}{
		"timestamp":  time.Now().Format(time.RFC3339),
		"event_type": eventType,
		"data":       data,
	}
	payload, _ := json.Marshal(event)
	s.nc.Publish(fmt.Sprintf("home.events.system.%s", eventType), payload)
}

func (s *Service) respondJSON(msg *nats.Msg, data interface{}) {
	if msg.Reply == "" {
		return
	}
	payload, _ := json.Marshal(data)
	s.nc.Publish(msg.Reply, payload)
}

func (s *Service) respondError(msg *nats.Msg, errMsg string) {
	if msg.Reply == "" {
		return
	}
	response := map[string]interface{}{
		"error": errMsg,
	}
	payload, _ := json.Marshal(response)
	s.nc.Publish(msg.Reply, payload)
}

// handleConfigRequest handles device configuration get requests
func (s *Service) handleConfigRequest(msg *nats.Msg) {
	// Extract device ID from subject
	// Subject format: home.config.device.{id}
	parts := strings.Split(msg.Subject, ".")
	if len(parts) < 4 {
		s.respondError(msg, "invalid subject format")
		return
	}
	deviceID := parts[3]

	// Get config
	config, err := s.configMgr.GetDeviceConfig(deviceID)
	if err != nil {
		// Return empty config if not found
		newConfig := models.NewDeviceConfig(deviceID)
		s.respondJSON(msg, newConfig)
		return
	}

	s.respondJSON(msg, config)
}

// handleConfigCommand handles configuration management commands
func (s *Service) handleConfigCommand(msg *nats.Msg) {
	var command struct {
		Command string                 `json:"command"`
		Params  map[string]interface{} `json:"params,omitempty"`
	}

	if err := json.Unmarshal(msg.Data, &command); err != nil {
		s.respondError(msg, "invalid command format")
		return
	}

	switch command.Command {
	case "set_device_config":
		var config models.DeviceConfig
		configData, _ := json.Marshal(command.Params["config"])
		if err := json.Unmarshal(configData, &config); err != nil {
			s.respondError(msg, "invalid config format")
			return
		}
		
		deviceType, _ := command.Params["device_type"].(string)
		if err := s.configMgr.SetDeviceConfig(&config, deviceType); err != nil {
			s.respondError(msg, err.Error())
			return
		}
		s.respondJSON(msg, map[string]interface{}{"success": true})

	case "get_device_config":
		deviceID, ok := command.Params["device_id"].(string)
		if !ok {
			s.respondError(msg, "device_id required")
			return
		}
		config, err := s.configMgr.GetDeviceConfig(deviceID)
		if err != nil {
			s.respondError(msg, err.Error())
			return
		}
		s.respondJSON(msg, config)

	case "delete_device_config":
		deviceID, ok := command.Params["device_id"].(string)
		if !ok {
			s.respondError(msg, "device_id required")
			return
		}
		if err := s.configMgr.DeleteDeviceConfig(deviceID); err != nil {
			s.respondError(msg, err.Error())
			return
		}
		s.respondJSON(msg, map[string]interface{}{"success": true})

	case "list_device_configs":
		configs, err := s.configMgr.ListDeviceConfigs()
		if err != nil {
			s.respondError(msg, err.Error())
			return
		}
		s.respondJSON(msg, map[string]interface{}{
			"configs": configs,
			"count":   len(configs),
		})

	case "set_system_config":
		var config models.SystemConfig
		configData, _ := json.Marshal(command.Params["config"])
		if err := json.Unmarshal(configData, &config); err != nil {
			s.respondError(msg, "invalid config format")
			return
		}
		if err := s.configMgr.SetSystemConfig(&config); err != nil {
			s.respondError(msg, err.Error())
			return
		}
		s.respondJSON(msg, map[string]interface{}{"success": true})

	case "get_system_config":
		component, ok := command.Params["component"].(string)
		if !ok {
			s.respondError(msg, "component required")
			return
		}
		config, err := s.configMgr.GetSystemConfig(component)
		if err != nil {
			s.respondError(msg, err.Error())
			return
		}
		s.respondJSON(msg, config)

	case "create_backup":
		description, _ := command.Params["description"].(string)
		backup, err := s.configMgr.CreateBackup(description)
		if err != nil {
			s.respondError(msg, err.Error())
			return
		}
		s.respondJSON(msg, backup)

	case "restore_backup":
		backupID, ok := command.Params["backup_id"].(string)
		if !ok {
			s.respondError(msg, "backup_id required")
			return
		}
		if err := s.configMgr.RestoreBackup(backupID); err != nil {
			s.respondError(msg, err.Error())
			return
		}
		s.respondJSON(msg, map[string]interface{}{"success": true})

	case "set_config_schema":
		deviceType, ok := command.Params["device_type"].(string)
		if !ok {
			s.respondError(msg, "device_type required")
			return
		}
		var schema models.ConfigSchema
		schemaData, _ := json.Marshal(command.Params["schema"])
		if err := json.Unmarshal(schemaData, &schema); err != nil {
			s.respondError(msg, "invalid schema format")
			return
		}
		if err := s.configMgr.SetConfigSchema(deviceType, schema); err != nil {
			s.respondError(msg, err.Error())
			return
		}
		s.respondJSON(msg, map[string]interface{}{"success": true})

	default:
		s.respondError(msg, "unknown command")
	}
}