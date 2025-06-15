package server

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
)

// Server represents the management UI server
type Server struct {
	config      *Config
	natsConn    *nats.Conn
	natsJS      nats.JetStreamContext
	router      *mux.Router
	httpServer  *http.Server
	wsUpgrader  websocket.Upgrader
	logger      *logrus.Logger
	
	// Data stores
	devices     map[string]*Device
	automations map[string]*Automation
	scenes      map[string]*Scene
	sessions    map[string]*Session
	events      []*Event
	eventsMu    sync.RWMutex
	mu          sync.RWMutex
	
	// WebSocket clients
	wsClients   map[string]*wsClient
	wsMu        sync.RWMutex
	
	// Discovery state
	discoveryActive    bool
	discoveryStartTime time.Time
}

type wsClient struct {
	conn   *websocket.Conn
	send   chan []byte
	userId string
}

// New creates a new server instance
func New(config *Config) (*Server, error) {
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)

	// Generate session secret if not provided
	if config.Session.Secret == "" {
		secret := make([]byte, 32)
		if _, err := rand.Read(secret); err != nil {
			return nil, fmt.Errorf("failed to generate session secret: %w", err)
		}
		config.Session.Secret = base64.StdEncoding.EncodeToString(secret)
	}

	s := &Server{
		config:      config,
		router:      mux.NewRouter(),
		logger:      logger,
		devices:     make(map[string]*Device),
		automations: make(map[string]*Automation),
		scenes:      make(map[string]*Scene),
		sessions:    make(map[string]*Session),
		events:      make([]*Event, 0, 1000), // Pre-allocate for 1000 events
		wsClients:   make(map[string]*wsClient),
		wsUpgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return config.API.EnableCORS
			},
		},
	}

	s.setupRoutes()

	s.httpServer = &http.Server{
		Addr:    config.HTTP.Addr,
		Handler: s.router,
	}

	return s, nil
}

// Start starts the server
func (s *Server) Start(ctx context.Context) error {
	// Connect to NATS
	if err := s.connectNATS(); err != nil {
		return fmt.Errorf("failed to connect to NATS: %w", err)
	}
	defer s.natsConn.Close()

	// Initialize JetStream
	if err := s.initJetStream(); err != nil {
		return fmt.Errorf("failed to initialize JetStream: %w", err)
	}

	// Load initial data
	if err := s.loadData(); err != nil {
		s.logger.Warnf("Failed to load initial data: %v", err)
	}

	// Start NATS subscriptions
	if err := s.startSubscriptions(); err != nil {
		return fmt.Errorf("failed to start subscriptions: %w", err)
	}

	// Start HTTP server
	go func() {
		s.logger.Infof("Starting HTTP server on %s", s.config.HTTP.Addr)
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.logger.Errorf("HTTP server error: %v", err)
		}
	}()

	// Publish service started event
	s.publishEvent("service_started", map[string]interface{}{
		"service": "management-ui",
		"version": "1.0.0",
	})

	// Wait for context cancellation
	<-ctx.Done()

	// Publish service stopped event
	s.publishEvent("service_stopped", map[string]interface{}{
		"service": "management-ui",
	})

	// Shutdown server
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	return s.httpServer.Shutdown(shutdownCtx)
}

func (s *Server) connectNATS() error {
	opts := []nats.Option{
		nats.Name("management-ui"),
		nats.ReconnectWait(time.Second),
		nats.MaxReconnects(-1),
		nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
			s.logger.Warnf("NATS disconnected: %v", err)
		}),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			s.logger.Info("NATS reconnected")
		}),
	}

	if s.config.NATS.Credentials != "" {
		opts = append(opts, nats.UserCredentials(s.config.NATS.Credentials))
	}

	conn, err := nats.Connect(s.config.NATS.URL, opts...)
	if err != nil {
		return err
	}

	s.natsConn = conn
	s.logger.Info("Connected to NATS server")
	return nil
}

func (s *Server) initJetStream() error {
	js, err := s.natsConn.JetStream()
	if err != nil {
		return err
	}

	s.natsJS = js

	// Create KV stores if they don't exist
	kvConfigs := []struct {
		name string
		ttl  time.Duration
	}{
		{"devices", 2 * time.Minute}, // Devices expire after 2 minutes without updates
		{"device-configs", 0},
		{"automations", 0},
		{"scenes", 0},
		{"dashboards", 0},
		{"users", 0},
	}

	for _, kvc := range kvConfigs {
		kvConfig := &nats.KeyValueConfig{
			Bucket: kvc.name,
			TTL:    kvc.ttl,
		}
		
		if _, err := js.KeyValue(kvc.name); err != nil {
			if _, err := js.CreateKeyValue(kvConfig); err != nil {
				s.logger.Warnf("Failed to create KV store %s: %v", kvc.name, err)
			} else {
				s.logger.Infof("Created KV store: %s", kvc.name)
			}
		}
	}

	return nil
}

func (s *Server) loadData() error {
	// Load devices from KV store
	if kv, err := s.natsJS.KeyValue("devices"); err == nil {
		keys, err := kv.Keys()
		if err == nil {
			for _, key := range keys {
				if entry, err := kv.Get(key); err == nil {
					var device Device
					if err := json.Unmarshal(entry.Value(), &device); err == nil {
						s.mu.Lock()
						s.devices[device.ID] = &device
						s.mu.Unlock()
					}
				}
			}
		}
	}

	// Load automations
	if kv, err := s.natsJS.KeyValue("automations"); err == nil {
		keys, err := kv.Keys()
		if err == nil {
			for _, key := range keys {
				if entry, err := kv.Get(key); err == nil {
					var automation Automation
					if err := json.Unmarshal(entry.Value(), &automation); err == nil {
						s.mu.Lock()
						s.automations[automation.ID] = &automation
						s.mu.Unlock()
					}
				}
			}
		}
	}

	// Load scenes
	if kv, err := s.natsJS.KeyValue("scenes"); err == nil {
		keys, err := kv.Keys()
		if err == nil {
			for _, key := range keys {
				if entry, err := kv.Get(key); err == nil {
					var scene Scene
					if err := json.Unmarshal(entry.Value(), &scene); err == nil {
						s.mu.Lock()
						s.scenes[scene.ID] = &scene
						s.mu.Unlock()
					}
				}
			}
		}
	}

	s.logger.Infof("Loaded %d devices, %d automations, %d scenes", 
		len(s.devices), len(s.automations), len(s.scenes))

	return nil
}

func (s *Server) startSubscriptions() error {
	// Subscribe to device state updates
	if _, err := s.natsConn.Subscribe("home.devices.*.state", s.handleDeviceState); err != nil {
		return err
	}

	// Subscribe to device announcements
	if _, err := s.natsConn.Subscribe("home.devices.*.announce", s.handleDeviceAnnounce); err != nil {
		return err
	}

	// Subscribe to events
	if _, err := s.natsConn.Subscribe("home.events.>", s.handleEvent); err != nil {
		return err
	}

	// Subscribe to scene activation requests (from automations)
	if _, err := s.natsConn.Subscribe("home.scenes.*.activate", s.handleSceneActivation); err != nil {
		return err
	}

	s.logger.Info("Started NATS subscriptions")
	return nil
}

func (s *Server) handleDeviceState(msg *nats.Msg) {
	// Parse device state update
	var state map[string]interface{}
	if err := json.Unmarshal(msg.Data, &state); err != nil {
		s.logger.Errorf("Failed to parse device state: %v", err)
		return
	}

	deviceID, _ := state["device_id"].(string)
	if deviceID == "" {
		return
	}

	s.mu.Lock()
	device, exists := s.devices[deviceID]
	if exists {
		device.State = state
		device.Online = true
		device.LastSeen = time.Now()
		device.UpdatedAt = time.Now()
	}
	s.mu.Unlock()

	// Create state change event
	event := Event{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Type:      "device_state_changed",
		Source:    msg.Subject,
		Data:      state,
		Timestamp: time.Now(),
	}
	s.storeEvent(&event)

	// Broadcast update to WebSocket clients
	s.broadcastDeviceUpdate(deviceID, state)
}

func (s *Server) handleDeviceAnnounce(msg *nats.Msg) {
	// Parse device announcement
	var announce map[string]interface{}
	if err := json.Unmarshal(msg.Data, &announce); err != nil {
		s.logger.Errorf("Failed to parse device announcement: %v", err)
		return
	}

	deviceID, _ := announce["device_id"].(string)
	if deviceID == "" {
		return
	}

	s.mu.Lock()
	device, exists := s.devices[deviceID]
	if !exists {
		device = &Device{
			ID:        deviceID,
			Name:      deviceID, // Default name
			CreatedAt: time.Now(),
			State:     make(map[string]interface{}),
			Config:    make(map[string]interface{}),
		}
		s.devices[deviceID] = device
	}

	// Update device info
	if deviceType, ok := announce["type"].(string); ok {
		device.Type = deviceType
	}
	if manufacturer, ok := announce["manufacturer"].(string); ok {
		device.Manufacturer = manufacturer
	}
	if model, ok := announce["model"].(string); ok {
		device.Model = model
	}
	
	device.Online = true
	device.LastSeen = time.Now()
	device.UpdatedAt = time.Now()
	s.mu.Unlock()

	// Save to KV store
	s.saveDevice(device)

	// Create device announced event
	event := Event{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Type:      "device_announced",
		Source:    msg.Subject,
		Data:      announce,
		Timestamp: time.Now(),
	}
	s.storeEvent(&event)

	s.logger.Infof("Device announced: %s", deviceID)
}

func (s *Server) handleEvent(msg *nats.Msg) {
	// Parse event type from subject
	parts := strings.Split(msg.Subject, ".")
	eventType := "unknown"
	if len(parts) >= 4 {
		eventType = parts[3] // e.g., home.events.system.service_started -> service_started
	}
	
	// Try to parse the data
	var eventData map[string]interface{}
	if err := json.Unmarshal(msg.Data, &eventData); err != nil {
		// If parsing fails, store raw data
		eventData = map[string]interface{}{"raw": string(msg.Data)}
	}
	
	event := Event{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Type:      eventType,
		Source:    msg.Subject,
		Data:      eventData,
		Timestamp: time.Now(),
	}

	// Store event
	s.storeEvent(&event)
	
	// Broadcast to WebSocket clients
	s.broadcastEvent(event)
}

func (s *Server) storeEvent(event *Event) {
	s.eventsMu.Lock()
	defer s.eventsMu.Unlock()
	
	// Add to the beginning of the slice (newest first)
	s.events = append([]*Event{event}, s.events...)
	
	// Keep only last 500 events in memory
	if len(s.events) > 500 {
		s.events = s.events[:500]
	}
}

func (s *Server) saveDevice(device *Device) {
	kv, err := s.natsJS.KeyValue("devices")
	if err != nil {
		s.logger.Errorf("Failed to get devices KV store: %v", err)
		return
	}

	data, err := json.Marshal(device)
	if err != nil {
		s.logger.Errorf("Failed to marshal device: %v", err)
		return
	}

	if _, err := kv.Put(device.ID, data); err != nil {
		s.logger.Errorf("Failed to save device: %v", err)
	}
}

func (s *Server) broadcastDeviceUpdate(deviceID string, state map[string]interface{}) {
	msg := map[string]interface{}{
		"type":      "device_update",
		"device_id": deviceID,
		"state":     state,
		"timestamp": time.Now(),
	}

	s.broadcast(msg)
}

func (s *Server) broadcastEvent(event Event) {
	msg := map[string]interface{}{
		"type":  "event",
		"event": event,
	}

	s.broadcast(msg)
}

func (s *Server) broadcast(message interface{}) {
	data, err := json.Marshal(message)
	if err != nil {
		s.logger.Errorf("Failed to marshal broadcast message: %v", err)
		return
	}

	s.wsMu.RLock()
	defer s.wsMu.RUnlock()

	for id, client := range s.wsClients {
		select {
		case client.send <- data:
		default:
			// Client's send channel is full, close it
			s.logger.Warnf("Closing slow WebSocket client: %s", id)
			close(client.send)
			delete(s.wsClients, id)
		}
	}
}

// handleSceneActivation handles scene activation requests from NATS (e.g., from automations)
func (s *Server) handleSceneActivation(msg *nats.Msg) {
	// Extract scene ID from subject (home.scenes.{scene_id}.activate)
	parts := strings.Split(msg.Subject, ".")
	if len(parts) < 4 {
		s.logger.Errorf("Invalid scene activation subject: %s", msg.Subject)
		return
	}
	sceneID := parts[2]

	s.mu.RLock()
	scene, exists := s.scenes[sceneID]
	s.mu.RUnlock()

	if !exists {
		s.logger.Errorf("Scene not found: %s", sceneID)
		return
	}

	s.logger.Infof("Activating scene %s via NATS", sceneID)

	// Activate scene by sending commands to all devices
	for _, entity := range scene.Entities {
		s.mu.RLock()
		device, exists := s.devices[entity.DeviceID]
		s.mu.RUnlock()

		if !exists {
			s.logger.Warnf("Device %s not found for scene %s", entity.DeviceID, sceneID)
			continue
		}

		// Build command subject
		subject := fmt.Sprintf("home.devices.%s.%s.command", device.Type, entity.DeviceID)
		
		// Build command payload
		payload := map[string]interface{}{
			"device_id": entity.DeviceID,
			"scene_id":  sceneID,
			"timestamp": time.Now().Unix(),
		}
		
		// Add state values as commands
		for k, v := range entity.State {
			payload[k] = v
		}

		// Publish command
		if data, err := json.Marshal(payload); err == nil {
			s.natsConn.Publish(subject, data)
			s.logger.Debugf("Sent command to device %s: %v", entity.DeviceID, payload)
		}
	}

	// Publish scene activated event
	event := map[string]interface{}{
		"scene_id":  sceneID,
		"timestamp": time.Now().Unix(),
		"source":    "nats_activation",
	}
	if data, err := json.Marshal(event); err == nil {
		s.natsConn.Publish("home.scenes.activated", data)
	}

	// Create event for tracking
	s.storeEvent(&Event{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Type:      "scene_activated",
		Source:    msg.Subject,
		Data:      map[string]interface{}{"scene_id": sceneID},
		Timestamp: time.Now(),
	})
}

// publishEvent publishes a system event
func (s *Server) publishEvent(eventType string, data interface{}) {
	event := map[string]interface{}{
		"timestamp":  time.Now().Format(time.RFC3339),
		"event_type": eventType,
		"data":       data,
	}
	payload, _ := json.Marshal(event)
	s.natsConn.Publish(fmt.Sprintf("home.events.system.%s", eventType), payload)
}