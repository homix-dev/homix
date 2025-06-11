package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
)

// Device handlers
func (s *Server) handleGetDevices(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	devices := make([]*Device, 0, len(s.devices))
	for _, device := range s.devices {
		devices = append(devices, device)
	}
	s.mu.RUnlock()

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    devices,
	})
}

func (s *Server) handleGetDevice(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["id"]

	s.mu.RLock()
	device, exists := s.devices[deviceID]
	s.mu.RUnlock()

	if !exists {
		s.sendError(w, http.StatusNotFound, "Device not found")
		return
	}

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    device,
	})
}

func (s *Server) handleCreateDevice(w http.ResponseWriter, r *http.Request) {
	var device Device
	if err := json.NewDecoder(r.Body).Decode(&device); err != nil {
		s.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Generate ID if not provided
	if device.ID == "" {
		device.ID = fmt.Sprintf("%s_%d", device.Type, time.Now().UnixNano())
	}

	// Set timestamps
	device.CreatedAt = time.Now()
	device.UpdatedAt = time.Now()
	device.LastSeen = time.Now()
	device.Online = true

	// Initialize state and config if not provided
	if device.State == nil {
		device.State = make(map[string]interface{})
	}
	if device.Config == nil {
		device.Config = make(map[string]interface{})
	}

	// Store device
	s.mu.Lock()
	s.devices[device.ID] = &device
	s.mu.Unlock()

	// Save to KV store
	s.saveDevice(&device)

	// Register with discovery service via NATS
	deviceMsg, _ := json.Marshal(device)
	s.natsConn.Publish("home.discovery.register", deviceMsg)

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    device,
		Message: "Device created successfully",
	})
}

func (s *Server) handleUpdateDevice(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["id"]

	var update map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		s.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	s.mu.Lock()
	device, exists := s.devices[deviceID]
	if !exists {
		s.mu.Unlock()
		s.sendError(w, http.StatusNotFound, "Device not found")
		return
	}

	// Update device fields
	if name, ok := update["name"].(string); ok {
		device.Name = name
	}
	if config, ok := update["config"].(map[string]interface{}); ok {
		for k, v := range config {
			device.Config[k] = v
		}
	}
	device.UpdatedAt = time.Now()
	s.mu.Unlock()

	// Save to KV store
	s.saveDevice(device)

	// Save config to device-configs KV
	if len(device.Config) > 0 {
		s.saveDeviceConfig(deviceID, device.Config)
	}

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    device,
		Message: "Device updated successfully",
	})
}

func (s *Server) handleDeleteDevice(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["id"]

	s.mu.Lock()
	_, exists := s.devices[deviceID]
	if !exists {
		s.mu.Unlock()
		s.sendError(w, http.StatusNotFound, "Device not found")
		return
	}
	delete(s.devices, deviceID)
	s.mu.Unlock()

	// Remove from KV store
	if kv, err := s.natsJS.KeyValue("devices"); err == nil {
		kv.Delete(deviceID)
	}

	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Device deleted successfully",
	})
}

func (s *Server) handleDeviceCommand(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["id"]

	var cmd DeviceCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		s.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	s.mu.RLock()
	device, exists := s.devices[deviceID]
	s.mu.RUnlock()

	if !exists {
		s.sendError(w, http.StatusNotFound, "Device not found")
		return
	}

	// Build NATS subject
	subject := fmt.Sprintf("home.devices.%s.%s.command", device.Type, deviceID)
	
	// Build command payload
	payload := map[string]interface{}{
		"device_id": deviceID,
		"command":   cmd.Command,
		"timestamp": time.Now().Unix(),
	}
	for k, v := range cmd.Data {
		payload[k] = v
	}

	// Publish command
	data, err := json.Marshal(payload)
	if err != nil {
		s.sendError(w, http.StatusInternalServerError, "Failed to marshal command")
		return
	}

	if err := s.natsConn.Publish(subject, data); err != nil {
		s.sendError(w, http.StatusInternalServerError, "Failed to send command")
		return
	}

	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Command sent successfully",
	})
}

func (s *Server) handleDeviceHistory(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement device history retrieval from time-series store
	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    []interface{}{},
		Message: "History retrieval not yet implemented",
	})
}

// Automation handlers
func (s *Server) handleGetAutomations(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	automations := make([]*Automation, 0, len(s.automations))
	for _, automation := range s.automations {
		automations = append(automations, automation)
	}
	s.mu.RUnlock()

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    automations,
	})
}

func (s *Server) handleCreateAutomation(w http.ResponseWriter, r *http.Request) {
	var automation Automation
	if err := json.NewDecoder(r.Body).Decode(&automation); err != nil {
		s.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Generate ID if not provided
	if automation.ID == "" {
		automation.ID = fmt.Sprintf("automation_%d", time.Now().UnixNano())
	}
	automation.CreatedAt = time.Now()
	automation.UpdatedAt = time.Now()
	automation.RunCount = 0

	s.mu.Lock()
	s.automations[automation.ID] = &automation
	s.mu.Unlock()

	// Save to KV store
	s.saveAutomation(&automation)

	// Publish automation created event
	s.publishAutomationEvent("created", automation.ID)

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    automation,
		Message: "Automation created successfully",
	})
}

func (s *Server) handleGetAutomation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	automationID := vars["id"]

	s.mu.RLock()
	automation, exists := s.automations[automationID]
	s.mu.RUnlock()

	if !exists {
		s.sendError(w, http.StatusNotFound, "Automation not found")
		return
	}

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    automation,
	})
}

func (s *Server) handleUpdateAutomation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	automationID := vars["id"]

	var update Automation
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		s.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	s.mu.Lock()
	automation, exists := s.automations[automationID]
	if !exists {
		s.mu.Unlock()
		s.sendError(w, http.StatusNotFound, "Automation not found")
		return
	}

	// Update fields
	automation.Name = update.Name
	automation.Description = update.Description
	automation.Triggers = update.Triggers
	automation.Conditions = update.Conditions
	automation.Actions = update.Actions
	automation.UpdatedAt = time.Now()
	s.mu.Unlock()

	// Save to KV store
	s.saveAutomation(automation)

	// Publish automation updated event
	s.publishAutomationEvent("updated", automationID)

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    automation,
		Message: "Automation updated successfully",
	})
}

func (s *Server) handleDeleteAutomation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	automationID := vars["id"]

	s.mu.Lock()
	_, exists := s.automations[automationID]
	if !exists {
		s.mu.Unlock()
		s.sendError(w, http.StatusNotFound, "Automation not found")
		return
	}
	delete(s.automations, automationID)
	s.mu.Unlock()

	// Remove from KV store
	if kv, err := s.natsJS.KeyValue("automations"); err == nil {
		kv.Delete(automationID)
	}

	// Publish automation deleted event
	s.publishAutomationEvent("deleted", automationID)

	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Automation deleted successfully",
	})
}

func (s *Server) handleEnableAutomation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	automationID := vars["id"]

	s.mu.Lock()
	automation, exists := s.automations[automationID]
	if !exists {
		s.mu.Unlock()
		s.sendError(w, http.StatusNotFound, "Automation not found")
		return
	}
	automation.Enabled = true
	automation.UpdatedAt = time.Now()
	s.mu.Unlock()

	// Save to KV store
	s.saveAutomation(automation)

	// Publish automation enabled event
	s.publishAutomationEvent("enabled", automationID)

	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Automation enabled successfully",
	})
}

func (s *Server) handleDisableAutomation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	automationID := vars["id"]

	s.mu.Lock()
	automation, exists := s.automations[automationID]
	if !exists {
		s.mu.Unlock()
		s.sendError(w, http.StatusNotFound, "Automation not found")
		return
	}
	automation.Enabled = false
	automation.UpdatedAt = time.Now()
	s.mu.Unlock()

	// Save to KV store
	s.saveAutomation(automation)

	// Publish automation disabled event
	s.publishAutomationEvent("disabled", automationID)

	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Automation disabled successfully",
	})
}

func (s *Server) handleTestAutomation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	automationID := vars["id"]

	var test AutomationTest
	if err := json.NewDecoder(r.Body).Decode(&test); err != nil {
		s.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	s.mu.RLock()
	_, exists := s.automations[automationID]
	s.mu.RUnlock()

	if !exists {
		s.sendError(w, http.StatusNotFound, "Automation not found")
		return
	}

	// Publish test request
	testData := map[string]interface{}{
		"automation_id": automationID,
		"test":          true,
		"test_data":     test.TestData,
		"timestamp":     time.Now().Unix(),
	}

	data, _ := json.Marshal(testData)
	s.natsConn.Publish("home.automations.test", data)

	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Automation test triggered",
	})
}

// Scene handlers
func (s *Server) handleGetScenes(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	scenes := make([]*Scene, 0, len(s.scenes))
	for _, scene := range s.scenes {
		scenes = append(scenes, scene)
	}
	s.mu.RUnlock()

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    scenes,
	})
}

func (s *Server) handleCreateScene(w http.ResponseWriter, r *http.Request) {
	var scene Scene
	if err := json.NewDecoder(r.Body).Decode(&scene); err != nil {
		s.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Generate ID if not provided
	if scene.ID == "" {
		scene.ID = fmt.Sprintf("scene_%d", time.Now().UnixNano())
	}
	scene.CreatedAt = time.Now()
	scene.UpdatedAt = time.Now()

	s.mu.Lock()
	s.scenes[scene.ID] = &scene
	s.mu.Unlock()

	// Save to KV store
	s.saveScene(&scene)

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    scene,
		Message: "Scene created successfully",
	})
}

func (s *Server) handleGetScene(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sceneID := vars["id"]

	s.mu.RLock()
	scene, exists := s.scenes[sceneID]
	s.mu.RUnlock()

	if !exists {
		s.sendError(w, http.StatusNotFound, "Scene not found")
		return
	}

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    scene,
	})
}

func (s *Server) handleUpdateScene(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sceneID := vars["id"]

	var update Scene
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		s.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	s.mu.Lock()
	scene, exists := s.scenes[sceneID]
	if !exists {
		s.mu.Unlock()
		s.sendError(w, http.StatusNotFound, "Scene not found")
		return
	}

	// Update fields
	scene.Name = update.Name
	scene.Description = update.Description
	scene.Icon = update.Icon
	scene.Entities = update.Entities
	scene.UpdatedAt = time.Now()
	s.mu.Unlock()

	// Save to KV store
	s.saveScene(scene)

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    scene,
		Message: "Scene updated successfully",
	})
}

func (s *Server) handleDeleteScene(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sceneID := vars["id"]

	s.mu.Lock()
	_, exists := s.scenes[sceneID]
	if !exists {
		s.mu.Unlock()
		s.sendError(w, http.StatusNotFound, "Scene not found")
		return
	}
	delete(s.scenes, sceneID)
	s.mu.Unlock()

	// Remove from KV store
	if kv, err := s.natsJS.KeyValue("scenes"); err == nil {
		kv.Delete(sceneID)
	}

	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Scene deleted successfully",
	})
}

func (s *Server) handleActivateScene(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sceneID := vars["id"]

	s.mu.RLock()
	scene, exists := s.scenes[sceneID]
	s.mu.RUnlock()

	if !exists {
		s.sendError(w, http.StatusNotFound, "Scene not found")
		return
	}

	// Activate scene by sending commands to all devices
	for _, entity := range scene.Entities {
		s.mu.RLock()
		device, exists := s.devices[entity.DeviceID]
		s.mu.RUnlock()

		if !exists {
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
		}
	}

	// Publish scene activated event
	event := map[string]interface{}{
		"scene_id":  sceneID,
		"timestamp": time.Now().Unix(),
	}
	if data, err := json.Marshal(event); err == nil {
		s.natsConn.Publish("home.scenes.activated", data)
	}

	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Scene activated successfully",
	})
}

// Dashboard handlers
func (s *Server) handleGetDashboards(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement dashboard management
	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    []interface{}{},
	})
}

func (s *Server) handleCreateDashboard(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement dashboard creation
	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Dashboard creation not yet implemented",
	})
}

func (s *Server) handleGetDashboard(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement dashboard retrieval
	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    nil,
	})
}

func (s *Server) handleUpdateDashboard(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement dashboard update
	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Dashboard update not yet implemented",
	})
}

func (s *Server) handleDeleteDashboard(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement dashboard deletion
	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Dashboard deletion not yet implemented",
	})
}

func (s *Server) handleStartDiscovery(w http.ResponseWriter, r *http.Request) {
	// Publish discovery start request to all bridges
	discoveryRequest := map[string]interface{}{
		"action":    "discover",
		"timestamp": time.Now().Unix(),
		"timeout":   30, // 30 seconds timeout
	}

	data, _ := json.Marshal(discoveryRequest)
	if err := s.natsConn.Publish("home.discovery.start", data); err != nil {
		s.sendError(w, http.StatusInternalServerError, "Failed to start discovery")
		return
	}

	// Track discovery status
	s.mu.Lock()
	s.discoveryActive = true
	s.discoveryStartTime = time.Now()
	s.mu.Unlock()

	// Set a timer to stop discovery after timeout
	go func() {
		time.Sleep(30 * time.Second)
		s.mu.Lock()
		s.discoveryActive = false
		s.mu.Unlock()
	}()

	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Device discovery started",
		Data: map[string]interface{}{
			"timeout": 30,
			"started": time.Now(),
		},
	})
}

func (s *Server) handleDiscoveryStatus(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	active := s.discoveryActive
	startTime := s.discoveryStartTime
	s.mu.RUnlock()

	status := map[string]interface{}{
		"active":     active,
		"start_time": startTime,
	}

	if active {
		elapsed := time.Since(startTime)
		remaining := 30*time.Second - elapsed
		if remaining < 0 {
			remaining = 0
		}
		status["remaining_seconds"] = int(remaining.Seconds())
	}

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    status,
	})
}

// System handlers
func (s *Server) handleSystemInfo(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	info := SystemInfo{
		Version:         "1.0.0",
		StartTime:       time.Now(), // TODO: Track actual start time
		DeviceCount:     len(s.devices),
		AutomationCount: len(s.automations),
		SceneCount:      len(s.scenes),
		EventCount:      0, // TODO: Track event count
		NATSConnected:   s.natsConn != nil && s.natsConn.IsConnected(),
		SystemHealth:    "healthy",
	}
	s.mu.RUnlock()

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    info,
	})
}

func (s *Server) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
		"nats":      s.natsConn != nil && s.natsConn.IsConnected(),
	}

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    health,
	})
}

func (s *Server) handleGetConfig(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement configuration retrieval
	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    map[string]interface{}{},
	})
}

func (s *Server) handleUpdateConfig(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement configuration update
	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Configuration update not yet implemented",
	})
}

func (s *Server) handleGetLogs(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	// TODO: Implement log retrieval
	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    []interface{}{},
		Message: fmt.Sprintf("Log retrieval not yet implemented (limit: %d)", limit),
	})
}

func (s *Server) handleGetEvents(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement event retrieval
	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    []interface{}{},
	})
}

// Auth handlers
func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var loginReq LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
		s.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate credentials by attempting to connect to NATS
	testConn, err := nats.Connect(
		s.config.NATS.URL,
		nats.UserInfo(loginReq.Username, loginReq.Password),
		nats.Timeout(5*time.Second),
	)
	if err != nil {
		s.logger.Warnf("Login failed for user %s: %v", loginReq.Username, err)
		s.sendJSON(w, LoginResponse{
			Success: false,
			Error:   "Invalid username or password",
		})
		return
	}
	defer testConn.Close()

	// Create session
	sessionID := fmt.Sprintf("session_%d", time.Now().UnixNano())
	session := &Session{
		ID:           sessionID,
		UserID:       loginReq.Username,
		Username:     loginReq.Username,
		NATSUser:     loginReq.Username,
		NATSPassword: loginReq.Password,
		CreatedAt:    time.Now(),
		ExpiresAt:    time.Now().Add(time.Duration(s.config.Session.Timeout)),
	}

	// Store session
	s.mu.Lock()
	s.sessions[sessionID] = session
	s.mu.Unlock()

	// Create user object
	user := &User{
		ID:        loginReq.Username,
		Username:  loginReq.Username,
		Email:     fmt.Sprintf("%s@nats.local", loginReq.Username),
		Role:      s.getUserRole(loginReq.Username),
		LastLogin: time.Now(),
	}

	s.logger.Infof("User %s logged in successfully", loginReq.Username)

	// Return session token and user info
	s.sendJSON(w, LoginResponse{
		Success: true,
		Token:   sessionID,
		User:    user,
	})
}

func (s *Server) getUserRole(username string) string {
	// Define role mappings - this could be configured
	switch username {
	case "admin", "home":
		return "admin"
	case "viewer":
		return "viewer"
	default:
		return "user"
	}
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	// Get session from request
	token := r.Header.Get("Authorization")
	if token != "" && strings.HasPrefix(token, "Bearer ") {
		sessionID := strings.TrimPrefix(token, "Bearer ")
		
		// Remove session
		s.mu.Lock()
		delete(s.sessions, sessionID)
		s.mu.Unlock()
	}

	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "Logout successful",
	})
}

func (s *Server) handleGetCurrentUser(w http.ResponseWriter, r *http.Request) {
	// Get session from context (set by auth middleware)
	sessionVal := r.Context().Value("session")
	if sessionVal == nil {
		s.sendError(w, http.StatusUnauthorized, "No session found")
		return
	}
	session := sessionVal.(*Session)
	
	user := User{
		ID:       session.UserID,
		Username: session.Username,
		Email:    fmt.Sprintf("%s@nats.local", session.Username),
		Role:     s.getUserRole(session.Username),
	}

	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    user,
	})
}

func (s *Server) handleGetUsers(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement user management
	s.sendJSON(w, APIResponse{
		Success: true,
		Data:    []interface{}{},
	})
}

func (s *Server) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement user creation
	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "User creation not yet implemented",
	})
}

func (s *Server) handleUpdateUser(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement user update
	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "User update not yet implemented",
	})
}

func (s *Server) handleDeleteUser(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement user deletion
	s.sendJSON(w, APIResponse{
		Success: true,
		Message: "User deletion not yet implemented",
	})
}

// Helper methods
func (s *Server) sendJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		s.logger.Errorf("Failed to encode JSON response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

func (s *Server) sendError(w http.ResponseWriter, code int, message string) {
	w.WriteHeader(code)
	s.sendJSON(w, APIResponse{
		Success: false,
		Error:   message,
	})
}

func (s *Server) saveDeviceConfig(deviceID string, config map[string]interface{}) {
	kv, err := s.natsJS.KeyValue("device-configs")
	if err != nil {
		s.logger.Errorf("Failed to get device-configs KV store: %v", err)
		return
	}

	data, err := json.Marshal(config)
	if err != nil {
		s.logger.Errorf("Failed to marshal device config: %v", err)
		return
	}

	if _, err := kv.Put(deviceID, data); err != nil {
		s.logger.Errorf("Failed to save device config: %v", err)
	}
}

func (s *Server) saveAutomation(automation *Automation) {
	kv, err := s.natsJS.KeyValue("automations")
	if err != nil {
		s.logger.Errorf("Failed to get automations KV store: %v", err)
		return
	}

	data, err := json.Marshal(automation)
	if err != nil {
		s.logger.Errorf("Failed to marshal automation: %v", err)
		return
	}

	if _, err := kv.Put(automation.ID, data); err != nil {
		s.logger.Errorf("Failed to save automation: %v", err)
	}
}

func (s *Server) saveScene(scene *Scene) {
	kv, err := s.natsJS.KeyValue("scenes")
	if err != nil {
		s.logger.Errorf("Failed to get scenes KV store: %v", err)
		return
	}

	data, err := json.Marshal(scene)
	if err != nil {
		s.logger.Errorf("Failed to marshal scene: %v", err)
		return
	}

	if _, err := kv.Put(scene.ID, data); err != nil {
		s.logger.Errorf("Failed to save scene: %v", err)
	}
}

func (s *Server) publishAutomationEvent(eventType, automationID string) {
	event := map[string]interface{}{
		"type":          eventType,
		"automation_id": automationID,
		"timestamp":     time.Now().Unix(),
	}

	if data, err := json.Marshal(event); err == nil {
		s.natsConn.Publish("home.automations.events", data)
	}
}