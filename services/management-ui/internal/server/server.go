package server

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
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

	// Wait for context cancellation
	<-ctx.Done()

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
		{"devices", 0},
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
	if _, err := s.natsConn.Subscribe("home.devices.*.*.state", s.handleDeviceState); err != nil {
		return err
	}

	// Subscribe to device announcements
	if _, err := s.natsConn.Subscribe("home.devices.*.*.announce", s.handleDeviceAnnounce); err != nil {
		return err
	}

	// Subscribe to events
	if _, err := s.natsConn.Subscribe("home.events.>", s.handleEvent); err != nil {
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

	s.logger.Infof("Device announced: %s", deviceID)
}

func (s *Server) handleEvent(msg *nats.Msg) {
	// Log event for now
	s.logger.Debugf("Event received: %s", msg.Subject)
	
	// TODO: Store events in time-series database or event store
	// For now, just broadcast to WebSocket clients
	event := Event{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Type:      "system",
		Source:    msg.Subject,
		Data:      map[string]interface{}{"raw": string(msg.Data)},
		Timestamp: time.Now(),
	}

	s.broadcastEvent(event)
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