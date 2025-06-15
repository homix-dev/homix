package main

import (
	"context"
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

//go:embed static/*
var staticFiles embed.FS

type Config struct {
	NATSUrl     string `json:"nats_url"`
	HTTPPort    string `json:"http_port"`
	WSPort      string `json:"ws_port"`
	KVBucket    string `json:"kv_bucket"`
	Debug       bool   `json:"debug"`
}

type DeviceState struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type"`
	Name       string                 `json:"name"`
	Room       string                 `json:"room"`
	State      map[string]interface{} `json:"state"`
	Online     bool                   `json:"online"`
	LastUpdate time.Time              `json:"last_update"`
}

type SimulatedDevice struct {
	*DeviceState
	nc           *nats.Conn
	js           jetstream.JetStream
	stopCh       chan bool
	updateTicker *time.Ticker
	mu           sync.RWMutex
}

type Simulator struct {
	nc      *nats.Conn
	js      jetstream.JetStream
	kv      jetstream.KeyValue
	devices map[string]*SimulatedDevice
	mu      sync.RWMutex
	config  *Config
	wsHub   *WSHub
}

type WSHub struct {
	clients    map[*WSClient]bool
	broadcast  chan []byte
	register   chan *WSClient
	unregister chan *WSClient
}

type WSClient struct {
	hub  *WSHub
	conn *websocket.Conn
	send chan []byte
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	var configPath string
	flag.StringVar(&configPath, "config", "", "Path to config file")
	flag.Parse()

	config := &Config{
		NATSUrl:  "nats://simulator:simulate@localhost:4222",
		HTTPPort: "8083",
		WSPort:   "8084",
		KVBucket: "device-simulator",
		Debug:    false,
	}

	// Connect to NATS
	nc, err := nats.Connect(config.NATSUrl)
	if err != nil {
		log.Fatal("Failed to connect to NATS:", err)
	}
	defer nc.Close()

	js, err := jetstream.New(nc)
	if err != nil {
		log.Fatal("Failed to create JetStream context:", err)
	}

	// Create KV bucket for simulator state
	kv, err := js.CreateKeyValue(context.Background(), jetstream.KeyValueConfig{
		Bucket:      config.KVBucket,
		Description: "Device simulator state",
		TTL:         24 * time.Hour,
	})
	if err != nil {
		log.Fatal("Failed to create KV bucket:", err)
	}

	// Create WebSocket hub
	wsHub := &WSHub{
		clients:    make(map[*WSClient]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *WSClient),
		unregister: make(chan *WSClient),
	}
	go wsHub.run()

	// Create simulator
	sim := &Simulator{
		nc:      nc,
		js:      js,
		kv:      kv,
		devices: make(map[string]*SimulatedDevice),
		config:  config,
		wsHub:   wsHub,
	}

	// Load saved devices
	sim.loadDevices()

	// Publish service started event
	sim.publishEvent("service_started", map[string]interface{}{
		"service": "device-simulator",
		"version": "1.0.0",
	})

	// Setup HTTP routes
	router := mux.NewRouter()
	
	// API routes
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/devices", sim.handleGetDevices).Methods("GET")
	api.HandleFunc("/devices", sim.handleCreateDevice).Methods("POST")
	api.HandleFunc("/devices/{id}", sim.handleGetDevice).Methods("GET")
	api.HandleFunc("/devices/{id}", sim.handleUpdateDevice).Methods("PUT")
	api.HandleFunc("/devices/{id}", sim.handleDeleteDevice).Methods("DELETE")
	api.HandleFunc("/devices/{id}/state", sim.handleUpdateState).Methods("PUT")
	api.HandleFunc("/devices/{id}/toggle", sim.handleToggleDevice).Methods("POST")
	api.HandleFunc("/devices/export", sim.handleExportDevices).Methods("GET")
	api.HandleFunc("/devices/import", sim.handleImportDevices).Methods("POST")
	api.HandleFunc("/device-types", sim.handleGetDeviceTypes).Methods("GET")
	
	// WebSocket endpoint
	router.HandleFunc("/ws", sim.handleWebSocket)
	
	// Static files
	fs, _ := fs.Sub(staticFiles, "static")
	router.PathPrefix("/").Handler(http.FileServer(http.FS(fs)))

	// Setup graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle shutdown signals
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		
		log.Println("Shutting down device simulator...")
		
		// Publish service stopped event
		sim.publishEvent("service_stopped", map[string]interface{}{
			"service": "device-simulator",
		})
		
		// Give time for the event to be published
		time.Sleep(100 * time.Millisecond)
		
		cancel()
	}()

	// Start HTTP server
	log.Printf("Device Simulator starting on http://localhost:%s", config.HTTPPort)
	server := &http.Server{
		Addr:    ":" + config.HTTPPort,
		Handler: router,
	}
	
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start HTTP server:", err)
		}
	}()
	
	// Wait for shutdown
	<-ctx.Done()
	
	// Shutdown HTTP server
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP server shutdown error: %v", err)
	}
}

// WebSocket hub methods
func (h *WSHub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			
		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

func (c *WSClient) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	
	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *WSClient) writePump() {
	defer c.conn.Close()
	
	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.conn.WriteMessage(websocket.TextMessage, message)
		}
	}
}

// Simulator methods
func (s *Simulator) loadDevices() {
	ctx := context.Background()
	keys, err := s.kv.Keys(ctx)
	if err != nil {
		log.Printf("Failed to load device keys: %v", err)
		return
	}

	for _, key := range keys {
		entry, err := s.kv.Get(ctx, key)
		if err != nil {
			continue
		}

		var state DeviceState
		if err := json.Unmarshal(entry.Value(), &state); err != nil {
			continue
		}

		s.createSimulatedDevice(&state)
	}
}

func (s *Simulator) createSimulatedDevice(state *DeviceState) *SimulatedDevice {
	device := &SimulatedDevice{
		DeviceState: state,
		nc:          s.nc,
		js:          s.js,
		stopCh:      make(chan bool),
	}

	// Start device simulation
	go device.run()

	s.mu.Lock()
	s.devices[state.ID] = device
	s.mu.Unlock()

	// Save to KV
	data, _ := json.Marshal(state)
	s.kv.Put(context.Background(), state.ID, data)

	// Register with device registry
	s.registerDevice(state)

	return device
}

func (s *Simulator) registerDevice(state *DeviceState) {
	// Register device with the main system
	deviceInfo := map[string]interface{}{
		"id":     state.ID,
		"type":   state.Type,
		"name":   state.Name,
		"room":   state.Room,
		"online": state.Online,
		"state":  state.State,
		"metadata": map[string]interface{}{
			"simulated": true,
			"source":    "device-simulator",
		},
	}

	data, _ := json.Marshal(deviceInfo)
	s.nc.Publish(fmt.Sprintf("home.devices.%s.announce", state.ID), data)
}

func (s *Simulator) broadcastUpdate(deviceID string, updateType string) {
	s.mu.RLock()
	device, exists := s.devices[deviceID]
	s.mu.RUnlock()

	if !exists {
		return
	}

	update := map[string]interface{}{
		"type":      updateType,
		"device_id": deviceID,
		"device":    device.DeviceState,
		"timestamp": time.Now(),
	}

	data, _ := json.Marshal(update)
	s.wsHub.broadcast <- data
}

// Device simulation
func (d *SimulatedDevice) run() {
	// Subscribe to commands
	sub, err := d.nc.Subscribe(fmt.Sprintf("home.devices.%s.command", d.ID), func(msg *nats.Msg) {
		var cmd map[string]interface{}
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			return
		}

		d.handleCommand(cmd)
		
		// Send response
		response := map[string]interface{}{
			"success": true,
			"device_id": d.ID,
			"command": cmd,
		}
		respData, _ := json.Marshal(response)
		msg.Respond(respData)
	})
	if err != nil {
		log.Printf("Failed to subscribe to commands for %s: %v", d.ID, err)
		return
	}
	defer sub.Unsubscribe()

	// Start update ticker based on device type
	d.startUpdateTicker()

	// Send initial state
	d.publishState()

	// Start heartbeat ticker (re-announce every 30 seconds)
	heartbeatTicker := time.NewTicker(30 * time.Second)
	defer heartbeatTicker.Stop()

	// Announce immediately
	d.announce()

	// Wait for stop signal or heartbeat
	for {
		select {
		case <-d.stopCh:
			return
		case <-heartbeatTicker.C:
			d.announce()
		}
	}
	if d.updateTicker != nil {
		d.updateTicker.Stop()
	}
}

func (d *SimulatedDevice) startUpdateTicker() {
	switch d.Type {
	case "sensor":
		// Sensors update frequently
		d.updateTicker = time.NewTicker(10 * time.Second)
		go func() {
			for range d.updateTicker.C {
				d.simulateSensorUpdate()
			}
		}()
		
	case "thermostat":
		// Thermostats update periodically
		d.updateTicker = time.NewTicker(30 * time.Second)
		go func() {
			for range d.updateTicker.C {
				d.simulateThermostatUpdate()
			}
		}()
	}
}

func (d *SimulatedDevice) handleCommand(cmd map[string]interface{}) {
	d.mu.Lock()
	defer d.mu.Unlock()

	command, ok := cmd["command"].(string)
	if !ok {
		return
	}

	switch d.Type {
	case "light":
		d.handleLightCommand(command, cmd)
	case "switch":
		d.handleSwitchCommand(command, cmd)
	case "thermostat":
		d.handleThermostatCommand(command, cmd)
	case "lock":
		d.handleLockCommand(command, cmd)
	case "cover":
		d.handleCoverCommand(command, cmd)
	}

	d.LastUpdate = time.Now()
	d.publishState()
}

func (d *SimulatedDevice) handleLightCommand(command string, cmd map[string]interface{}) {
	switch command {
	case "turn_on":
		d.State["state"] = "on"
		if brightness, ok := cmd["brightness"].(float64); ok {
			d.State["brightness"] = int(brightness)
		}
		if color, ok := cmd["color"].(map[string]interface{}); ok {
			d.State["color"] = color
		}
		
	case "turn_off":
		d.State["state"] = "off"
		
	case "toggle":
		if d.State["state"] == "on" {
			d.State["state"] = "off"
		} else {
			d.State["state"] = "on"
		}
		
	case "set_brightness":
		if brightness, ok := cmd["brightness"].(float64); ok {
			d.State["brightness"] = int(brightness)
			if d.State["brightness"].(int) > 0 {
				d.State["state"] = "on"
			}
		}
	}
}

func (d *SimulatedDevice) handleSwitchCommand(command string, cmd map[string]interface{}) {
	switch command {
	case "turn_on":
		d.State["state"] = "on"
	case "turn_off":
		d.State["state"] = "off"
	case "toggle":
		if d.State["state"] == "on" {
			d.State["state"] = "off"
		} else {
			d.State["state"] = "on"
		}
	}
}

func (d *SimulatedDevice) handleThermostatCommand(command string, cmd map[string]interface{}) {
	switch command {
	case "set_temperature":
		if temp, ok := cmd["temperature"].(float64); ok {
			d.State["target_temperature"] = temp
		}
		
	case "set_mode":
		if mode, ok := cmd["mode"].(string); ok {
			d.State["mode"] = mode
		}
		
	case "set_fan_mode":
		if fanMode, ok := cmd["fan_mode"].(string); ok {
			d.State["fan_mode"] = fanMode
		}
	}
}

func (d *SimulatedDevice) handleLockCommand(command string, cmd map[string]interface{}) {
	switch command {
	case "lock":
		d.State["state"] = "locked"
	case "unlock":
		d.State["state"] = "unlocked"
	}
}

func (d *SimulatedDevice) handleCoverCommand(command string, cmd map[string]interface{}) {
	switch command {
	case "open":
		d.State["state"] = "open"
		d.State["position"] = 100
		
	case "close":
		d.State["state"] = "closed"
		d.State["position"] = 0
		
	case "stop":
		d.State["state"] = "stopped"
		
	case "set_position":
		if position, ok := cmd["position"].(float64); ok {
			d.State["position"] = int(position)
			if position == 0 {
				d.State["state"] = "closed"
			} else if position == 100 {
				d.State["state"] = "open"
			} else {
				d.State["state"] = "open"
			}
		}
	}
}

func (d *SimulatedDevice) simulateSensorUpdate() {
	d.mu.Lock()
	defer d.mu.Unlock()

	// Simulate random sensor changes
	if temp, ok := d.State["temperature"].(float64); ok {
		// Random walk for temperature
		change := (float64(time.Now().UnixNano()%200) - 100) / 100.0
		d.State["temperature"] = temp + change
	}

	if humidity, ok := d.State["humidity"].(float64); ok {
		// Random walk for humidity
		change := (float64(time.Now().UnixNano()%100) - 50) / 50.0
		d.State["humidity"] = humidity + change
		if d.State["humidity"].(float64) < 0 {
			d.State["humidity"] = 0.0
		} else if d.State["humidity"].(float64) > 100 {
			d.State["humidity"] = 100.0
		}
	}

	d.LastUpdate = time.Now()
	d.publishState()
}

func (d *SimulatedDevice) simulateThermostatUpdate() {
	d.mu.Lock()
	defer d.mu.Unlock()

	// Simulate temperature moving toward target
	if current, ok := d.State["current_temperature"].(float64); ok {
		if target, ok := d.State["target_temperature"].(float64); ok {
			diff := target - current
			change := diff * 0.1 // Move 10% toward target
			d.State["current_temperature"] = current + change
		}
	}

	d.LastUpdate = time.Now()
	d.publishState()
}

func (d *SimulatedDevice) publishState() {
	stateData := map[string]interface{}{
		"device_id": d.ID,
		"state":     d.State,
		"online":    d.Online,
		"timestamp": time.Now(),
	}

	data, _ := json.Marshal(stateData)
	d.nc.Publish(fmt.Sprintf("home.devices.%s.state", d.ID), data)
}

func (d *SimulatedDevice) announce() {
	d.mu.RLock()
	// Create a deep copy of the state to avoid concurrent map access
	stateCopy := make(map[string]interface{})
	for k, v := range d.State {
		stateCopy[k] = v
	}
	
	deviceInfo := map[string]interface{}{
		"device_id":    d.ID,
		"type":         d.Type,
		"name":         d.Name,
		"room":         d.Room,
		"online":       d.Online,
		"state":        stateCopy,
		"manufacturer": "NATS Simulator",
		"model":        "Virtual Device",
		"metadata": map[string]interface{}{
			"simulated": true,
			"source":    "device-simulator",
		},
	}
	d.mu.RUnlock()

	data, _ := json.Marshal(deviceInfo)
	d.nc.Publish(fmt.Sprintf("home.devices.%s.announce", d.ID), data)
}

func (d *SimulatedDevice) stop() {
	close(d.stopCh)
}

// HTTP handlers
func (s *Simulator) handleGetDevices(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	devices := make([]*DeviceState, 0, len(s.devices))
	for _, device := range s.devices {
		devices = append(devices, device.DeviceState)
	}
	s.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(devices)
}

func (s *Simulator) handleCreateDevice(w http.ResponseWriter, r *http.Request) {
	var state DeviceState
	if err := json.NewDecoder(r.Body).Decode(&state); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Generate ID if not provided
	if state.ID == "" {
		state.ID = fmt.Sprintf("sim_%s_%d", state.Type, time.Now().Unix())
	}

	// Set defaults
	state.Online = true
	state.LastUpdate = time.Now()

	// Initialize state based on device type
	if state.State == nil {
		state.State = s.getDefaultState(state.Type)
	}

	device := s.createSimulatedDevice(&state)

	s.broadcastUpdate(device.ID, "device_created")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(device.DeviceState)
}

func (s *Simulator) handleGetDevice(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["id"]

	s.mu.RLock()
	device, exists := s.devices[deviceID]
	s.mu.RUnlock()

	if !exists {
		http.Error(w, "Device not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(device.DeviceState)
}

func (s *Simulator) handleUpdateDevice(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["id"]

	s.mu.RLock()
	device, exists := s.devices[deviceID]
	s.mu.RUnlock()

	if !exists {
		http.Error(w, "Device not found", http.StatusNotFound)
		return
	}

	var update DeviceState
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	device.mu.Lock()
	device.Name = update.Name
	device.Room = update.Room
	device.LastUpdate = time.Now()
	device.mu.Unlock()

	// Save to KV
	data, _ := json.Marshal(device.DeviceState)
	s.kv.Put(context.Background(), device.ID, data)

	s.broadcastUpdate(device.ID, "device_updated")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(device.DeviceState)
}

func (s *Simulator) handleDeleteDevice(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["id"]

	s.mu.Lock()
	device, exists := s.devices[deviceID]
	if exists {
		device.stop()
		delete(s.devices, deviceID)
	}
	s.mu.Unlock()

	if !exists {
		http.Error(w, "Device not found", http.StatusNotFound)
		return
	}

	// Remove from KV
	s.kv.Delete(context.Background(), deviceID)

	// Announce device offline
	s.nc.Publish(fmt.Sprintf("home.devices.%s.offline", deviceID), []byte{})

	s.broadcastUpdate(deviceID, "device_deleted")

	w.WriteHeader(http.StatusNoContent)
}

func (s *Simulator) handleUpdateState(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["id"]

	s.mu.RLock()
	device, exists := s.devices[deviceID]
	s.mu.RUnlock()

	if !exists {
		http.Error(w, "Device not found", http.StatusNotFound)
		return
	}

	var newState map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&newState); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	device.mu.Lock()
	for key, value := range newState {
		device.State[key] = value
	}
	device.LastUpdate = time.Now()
	device.mu.Unlock()

	device.publishState()
	s.broadcastUpdate(device.ID, "state_updated")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(device.State)
}

func (s *Simulator) handleToggleDevice(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["id"]

	s.mu.RLock()
	device, exists := s.devices[deviceID]
	s.mu.RUnlock()

	if !exists {
		http.Error(w, "Device not found", http.StatusNotFound)
		return
	}

	device.handleCommand(map[string]interface{}{
		"command": "toggle",
	})

	s.broadcastUpdate(device.ID, "state_updated")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(device.State)
}

func (s *Simulator) handleExportDevices(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	devices := make([]*DeviceState, 0, len(s.devices))
	for _, device := range s.devices {
		devices = append(devices, device.DeviceState)
	}
	s.mu.RUnlock()

	export := map[string]interface{}{
		"version":    "1.0",
		"timestamp":  time.Now(),
		"devices":    devices,
		"device_count": len(devices),
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=device-simulator-export-%d.json", time.Now().Unix()))
	json.NewEncoder(w).Encode(export)
}

func (s *Simulator) handleImportDevices(w http.ResponseWriter, r *http.Request) {
	var importData struct {
		Devices []*DeviceState `json:"devices"`
	}

	if err := json.NewDecoder(r.Body).Decode(&importData); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	imported := 0
	for _, state := range importData.Devices {
		// Check if device already exists
		s.mu.RLock()
		_, exists := s.devices[state.ID]
		s.mu.RUnlock()

		if !exists {
			s.createSimulatedDevice(state)
			imported++
		}
	}

	response := map[string]interface{}{
		"imported": imported,
		"skipped":  len(importData.Devices) - imported,
		"total":    len(importData.Devices),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Simulator) handleGetDeviceTypes(w http.ResponseWriter, r *http.Request) {
	deviceTypes := []map[string]interface{}{
		{
			"type": "light",
			"name": "Light",
			"icon": "fa-lightbulb",
			"default_state": map[string]interface{}{
				"state":      "off",
				"brightness": 100,
			},
		},
		{
			"type": "switch",
			"name": "Switch",
			"icon": "fa-toggle-on",
			"default_state": map[string]interface{}{
				"state": "off",
			},
		},
		{
			"type": "sensor",
			"name": "Sensor",
			"icon": "fa-thermometer-half",
			"default_state": map[string]interface{}{
				"temperature": 20.0,
				"humidity":    50.0,
			},
		},
		{
			"type": "thermostat",
			"name": "Thermostat",
			"icon": "fa-temperature-high",
			"default_state": map[string]interface{}{
				"mode":                "heat",
				"current_temperature": 20.0,
				"target_temperature":  22.0,
				"fan_mode":           "auto",
			},
		},
		{
			"type": "lock",
			"name": "Lock",
			"icon": "fa-lock",
			"default_state": map[string]interface{}{
				"state": "locked",
			},
		},
		{
			"type": "cover",
			"name": "Cover/Blind",
			"icon": "fa-window-maximize",
			"default_state": map[string]interface{}{
				"state":    "closed",
				"position": 0,
			},
		},
		{
			"type": "motion",
			"name": "Motion Sensor",
			"icon": "fa-walking",
			"default_state": map[string]interface{}{
				"motion": false,
			},
		},
		{
			"type": "door",
			"name": "Door Sensor",
			"icon": "fa-door-open",
			"default_state": map[string]interface{}{
				"contact": "closed",
			},
		},
		{
			"type": "camera",
			"name": "Camera",
			"icon": "fa-video",
			"default_state": map[string]interface{}{
				"state":     "idle",
				"recording": false,
			},
		},
		{
			"type": "fan",
			"name": "Fan",
			"icon": "fa-fan",
			"default_state": map[string]interface{}{
				"state": "off",
				"speed": "medium",
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(deviceTypes)
}

func (s *Simulator) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	client := &WSClient{
		hub:  s.wsHub,
		conn: conn,
		send: make(chan []byte, 256),
	}

	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (s *Simulator) getDefaultState(deviceType string) map[string]interface{} {
	defaults := map[string]map[string]interface{}{
		"light": {
			"state":      "off",
			"brightness": 100,
		},
		"switch": {
			"state": "off",
		},
		"sensor": {
			"temperature": 20.0,
			"humidity":    50.0,
		},
		"thermostat": {
			"mode":                "heat",
			"current_temperature": 20.0,
			"target_temperature":  22.0,
			"fan_mode":           "auto",
		},
		"lock": {
			"state": "locked",
		},
		"cover": {
			"state":    "closed",
			"position": 0,
		},
		"motion": {
			"motion": false,
		},
		"door": {
			"contact": "closed",
		},
		"camera": {
			"state":     "idle",
			"recording": false,
		},
		"fan": {
			"state": "off",
			"speed": "medium",
		},
	}

	if state, ok := defaults[deviceType]; ok {
		// Return a copy
		result := make(map[string]interface{})
		for k, v := range state {
			result[k] = v
		}
		return result
	}

	return make(map[string]interface{})
}

// publishEvent publishes a system event
func (s *Simulator) publishEvent(eventType string, data interface{}) {
	event := map[string]interface{}{
		"timestamp":  time.Now().Format(time.RFC3339),
		"event_type": eventType,
		"data":       data,
	}
	payload, _ := json.Marshal(event)
	s.nc.Publish(fmt.Sprintf("home.events.system.%s", eventType), payload)
}