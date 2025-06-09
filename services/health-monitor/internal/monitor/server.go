package monitor

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

// Server handles HTTP requests and WebSocket connections
type Server struct {
	config   HTTPConfig
	monitor  *Monitor
	router   *mux.Router
	server   *http.Server
	upgrader websocket.Upgrader
	logger   *logrus.Logger
}

// NewServer creates a new HTTP server
func NewServer(config HTTPConfig, monitor *Monitor) (*Server, error) {
	s := &Server{
		config:  config,
		monitor: monitor,
		router:  mux.NewRouter(),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins in development
			},
		},
		logger: logrus.New(),
	}

	s.setupRoutes()

	s.server = &http.Server{
		Addr:    config.Addr,
		Handler: s.router,
	}

	return s, nil
}

func (s *Server) setupRoutes() {
	// API routes
	api := s.router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/devices", s.handleGetDevices).Methods("GET")
	api.HandleFunc("/devices/{id}", s.handleGetDevice).Methods("GET")
	api.HandleFunc("/summary", s.handleGetSummary).Methods("GET")
	api.HandleFunc("/health", s.handleHealthCheck).Methods("GET")

	// WebSocket endpoint
	s.router.HandleFunc("/ws", s.handleWebSocket)

	// Static files
	s.router.PathPrefix("/").Handler(http.FileServer(http.Dir(s.config.Static)))
}

// Start starts the HTTP server
func (s *Server) Start() error {
	s.logger.Infof("Starting HTTP server on %s", s.config.Addr)
	return s.server.ListenAndServe()
}

// Stop stops the HTTP server
func (s *Server) Stop(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

func (s *Server) handleGetDevices(w http.ResponseWriter, r *http.Request) {
	data := s.monitor.GetDashboardData()
	s.sendJSON(w, data.Devices)
}

func (s *Server) handleGetDevice(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["id"]

	data := s.monitor.GetDashboardData()
	device, exists := data.Devices[deviceID]
	if !exists {
		http.Error(w, "Device not found", http.StatusNotFound)
		return
	}

	s.sendJSON(w, device)
}

func (s *Server) handleGetSummary(w http.ResponseWriter, r *http.Request) {
	summary := s.monitor.GetDeviceSummary()
	s.sendJSON(w, summary)
}

func (s *Server) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"status": "ok",
		"timestamp": time.Now(),
		"uptime": time.Since(s.monitor.startTime).String(),
	}
	s.sendJSON(w, health)
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Errorf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	clientID := fmt.Sprintf("ws-%d", time.Now().UnixNano())
	s.logger.Infof("WebSocket client connected: %s", clientID)

	// Subscribe to updates
	updates := s.monitor.Subscribe(clientID)
	defer s.monitor.Unsubscribe(clientID)

	// Send initial data
	initialData := s.monitor.GetDashboardData()
	if err := conn.WriteJSON(WebSocketMessage{
		Type: "initial",
		Data: initialData,
	}); err != nil {
		s.logger.Errorf("Failed to send initial data: %v", err)
		return
	}

	// Create channels for coordination
	done := make(chan struct{})
	
	// Handle incoming messages
	go func() {
		defer close(done)
		for {
			var msg WebSocketMessage
			if err := conn.ReadJSON(&msg); err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					s.logger.Errorf("WebSocket read error: %v", err)
				}
				return
			}
			// Handle client messages if needed
			s.logger.Debugf("Received WebSocket message: %v", msg)
		}
	}()

	// Send updates
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case data := <-updates:
			if err := conn.WriteJSON(WebSocketMessage{
				Type: "update",
				Data: data,
			}); err != nil {
				s.logger.Errorf("Failed to send update: %v", err)
				return
			}

		case <-ticker.C:
			// Send ping to keep connection alive
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}

		case <-done:
			return
		}
	}
}

func (s *Server) sendJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		s.logger.Errorf("Failed to encode JSON: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}