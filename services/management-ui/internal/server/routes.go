package server

import (
	"net/http"

	"github.com/gorilla/mux"
)

func (s *Server) setupRoutes() {
	// API routes
	api := s.router.PathPrefix(s.config.API.Prefix).Subrouter()
	
	// Middleware
	api.Use(s.loggingMiddleware)
	api.Use(s.corsMiddleware)
	api.Use(s.authMiddleware)

	// Device endpoints
	api.HandleFunc("/devices", s.handleGetDevices).Methods("GET")
	api.HandleFunc("/devices/{id}", s.handleGetDevice).Methods("GET")
	api.HandleFunc("/devices/{id}", s.handleUpdateDevice).Methods("PUT")
	api.HandleFunc("/devices/{id}", s.handleDeleteDevice).Methods("DELETE")
	api.HandleFunc("/devices/{id}/command", s.handleDeviceCommand).Methods("POST")
	api.HandleFunc("/devices/{id}/history", s.handleDeviceHistory).Methods("GET")
	api.HandleFunc("/devices/discovery/start", s.handleStartDiscovery).Methods("POST")
	api.HandleFunc("/devices/discovery/status", s.handleDiscoveryStatus).Methods("GET")

	// Automation endpoints
	api.HandleFunc("/automations", s.handleGetAutomations).Methods("GET")
	api.HandleFunc("/automations", s.handleCreateAutomation).Methods("POST")
	api.HandleFunc("/automations/{id}", s.handleGetAutomation).Methods("GET")
	api.HandleFunc("/automations/{id}", s.handleUpdateAutomation).Methods("PUT")
	api.HandleFunc("/automations/{id}", s.handleDeleteAutomation).Methods("DELETE")
	api.HandleFunc("/automations/{id}/enable", s.handleEnableAutomation).Methods("POST")
	api.HandleFunc("/automations/{id}/disable", s.handleDisableAutomation).Methods("POST")
	api.HandleFunc("/automations/{id}/test", s.handleTestAutomation).Methods("POST")

	// Scene endpoints
	api.HandleFunc("/scenes", s.handleGetScenes).Methods("GET")
	api.HandleFunc("/scenes", s.handleCreateScene).Methods("POST")
	api.HandleFunc("/scenes/{id}", s.handleGetScene).Methods("GET")
	api.HandleFunc("/scenes/{id}", s.handleUpdateScene).Methods("PUT")
	api.HandleFunc("/scenes/{id}", s.handleDeleteScene).Methods("DELETE")
	api.HandleFunc("/scenes/{id}/activate", s.handleActivateScene).Methods("POST")

	// Dashboard endpoints
	api.HandleFunc("/dashboards", s.handleGetDashboards).Methods("GET")
	api.HandleFunc("/dashboards", s.handleCreateDashboard).Methods("POST")
	api.HandleFunc("/dashboards/{id}", s.handleGetDashboard).Methods("GET")
	api.HandleFunc("/dashboards/{id}", s.handleUpdateDashboard).Methods("PUT")
	api.HandleFunc("/dashboards/{id}", s.handleDeleteDashboard).Methods("DELETE")

	// System endpoints
	api.HandleFunc("/system/info", s.handleSystemInfo).Methods("GET")
	api.HandleFunc("/system/health", s.handleHealthCheck).Methods("GET")
	api.HandleFunc("/system/config", s.handleGetConfig).Methods("GET")
	api.HandleFunc("/system/config", s.handleUpdateConfig).Methods("PUT")
	api.HandleFunc("/system/logs", s.handleGetLogs).Methods("GET")
	api.HandleFunc("/system/events", s.handleGetEvents).Methods("GET")

	// User/Auth endpoints
	api.HandleFunc("/auth/login", s.handleLogin).Methods("POST")
	api.HandleFunc("/auth/logout", s.handleLogout).Methods("POST")
	api.HandleFunc("/auth/user", s.handleGetCurrentUser).Methods("GET")
	api.HandleFunc("/users", s.handleGetUsers).Methods("GET")
	api.HandleFunc("/users", s.handleCreateUser).Methods("POST")
	api.HandleFunc("/users/{id}", s.handleUpdateUser).Methods("PUT")
	api.HandleFunc("/users/{id}", s.handleDeleteUser).Methods("DELETE")

	// WebSocket endpoint
	s.router.HandleFunc("/ws", s.handleWebSocket)

	// Static files
	s.router.PathPrefix("/").Handler(http.FileServer(http.Dir(s.config.HTTP.Static)))
}

// Middleware
func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.logger.Debugf("%s %s %s", r.RemoteAddr, r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.config.API.EnableCORS {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth for certain endpoints
		if r.URL.Path == s.config.API.Prefix+"/auth/login" ||
		   r.URL.Path == s.config.API.Prefix+"/system/health" {
			next.ServeHTTP(w, r)
			return
		}

		// TODO: Implement proper authentication
		// For now, just pass through
		next.ServeHTTP(w, r)
	})
}