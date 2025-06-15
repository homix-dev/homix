package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512 * 1024
)

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Errorf("WebSocket upgrade failed: %v", err)
		return
	}

	clientID := fmt.Sprintf("ws-%d", time.Now().UnixNano())
	client := &wsClient{
		conn:   conn,
		send:   make(chan []byte, 256),
		userId: "", // TODO: Get from session/auth
	}

	s.wsMu.Lock()
	s.wsClients[clientID] = client
	s.wsMu.Unlock()

	s.logger.Infof("WebSocket client connected: %s", clientID)

	// Start goroutines for reading and writing
	go client.writePump()
	go s.readPump(clientID, client)

	// Send initial data
	s.sendInitialData(client)
}

func (s *Server) readPump(clientID string, client *wsClient) {
	defer func() {
		s.wsMu.Lock()
		delete(s.wsClients, clientID)
		s.wsMu.Unlock()
		client.conn.Close()
		s.logger.Infof("WebSocket client disconnected: %s", clientID)
	}()

	client.conn.SetReadLimit(maxMessageSize)
	client.conn.SetReadDeadline(time.Now().Add(pongWait))
	client.conn.SetPongHandler(func(string) error {
		client.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		var msg map[string]interface{}
		err := client.conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				s.logger.Errorf("WebSocket error: %v", err)
			}
			break
		}

		// Handle client messages
		s.handleWebSocketMessage(clientID, client, msg)
	}
}

func (client *wsClient) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		client.conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.send:
			client.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The channel was closed
				client.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := client.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
			n := len(client.send)
			for i := 0; i < n; i++ {
				w.Write([]byte("\n"))
				w.Write(<-client.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			client.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := client.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (s *Server) handleWebSocketMessage(clientID string, client *wsClient, msg map[string]interface{}) {
	msgType, ok := msg["type"].(string)
	if !ok {
		s.logger.Warnf("WebSocket message without type from client %s", clientID)
		return
	}

	switch msgType {
	case "subscribe":
		// Handle subscription requests
		if topic, ok := msg["topic"].(string); ok {
			s.logger.Debugf("Client %s subscribed to topic: %s", clientID, topic)
			// TODO: Implement topic-based filtering
		}

	case "unsubscribe":
		// Handle unsubscription requests
		if topic, ok := msg["topic"].(string); ok {
			s.logger.Debugf("Client %s unsubscribed from topic: %s", clientID, topic)
			// TODO: Implement topic-based filtering
		}

	case "command":
		// Handle device commands via WebSocket
		if deviceID, ok := msg["device_id"].(string); ok {
			s.handleWebSocketCommand(client, deviceID, msg)
		}

	case "ping":
		// Respond with pong
		response := map[string]interface{}{
			"type":      "pong",
			"timestamp": time.Now().Unix(),
		}
		if data, err := json.Marshal(response); err == nil {
			select {
			case client.send <- data:
			default:
				s.logger.Warnf("Client %s send channel full", clientID)
			}
		}

	default:
		s.logger.Warnf("Unknown WebSocket message type from client %s: %s", clientID, msgType)
	}
}

func (s *Server) handleWebSocketCommand(client *wsClient, deviceID string, msg map[string]interface{}) {
	s.mu.RLock()
	device, exists := s.devices[deviceID]
	s.mu.RUnlock()

	if !exists {
		response := map[string]interface{}{
			"type":    "error",
			"message": "Device not found",
		}
		if data, err := json.Marshal(response); err == nil {
			select {
			case client.send <- data:
			default:
			}
		}
		return
	}

	// Extract command data
	command, _ := msg["command"].(string)
	cmdData, _ := msg["data"].(map[string]interface{})

	// Build NATS subject
	subject := fmt.Sprintf("home.devices.%s.%s.command", device.Type, deviceID)
	
	// Build command payload
	payload := map[string]interface{}{
		"device_id": deviceID,
		"command":   command,
		"timestamp": time.Now().Unix(),
	}
	for k, v := range cmdData {
		payload[k] = v
	}

	// Publish command
	if data, err := json.Marshal(payload); err == nil {
		if err := s.natsConn.Publish(subject, data); err != nil {
			s.logger.Errorf("Failed to publish command: %v", err)
		} else {
			// Send confirmation
			response := map[string]interface{}{
				"type":      "command_sent",
				"device_id": deviceID,
				"command":   command,
			}
			if respData, err := json.Marshal(response); err == nil {
				select {
				case client.send <- respData:
				default:
				}
			}
		}
	}
}

func (s *Server) sendInitialData(client *wsClient) {
	// Send current devices
	s.mu.RLock()
	devices := make([]*Device, 0, len(s.devices))
	for _, device := range s.devices {
		devices = append(devices, device)
	}
	s.mu.RUnlock()

	initialMsg := map[string]interface{}{
		"type": "initial_data",
		"data": map[string]interface{}{
			"devices":     devices,
			"automations": s.automations,
			"scenes":      s.scenes,
		},
		"timestamp": time.Now().Unix(),
	}

	if data, err := json.Marshal(initialMsg); err == nil {
		select {
		case client.send <- data:
		default:
			s.logger.Warn("Failed to send initial data to client")
		}
	}
}