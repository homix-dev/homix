package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"time"

	"github.com/nats-io/nats.go"
)

// DeviceState represents the state of our example device
type DeviceState struct {
	State      string    `json:"state"`
	Brightness int       `json:"brightness,omitempty"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// DeviceAnnouncement for discovery
type DeviceAnnouncement struct {
	ID           string   `json:"id"`
	Type         string   `json:"type"`
	Name         string   `json:"name"`
	Manufacturer string   `json:"manufacturer"`
	Model        string   `json:"model"`
	Capabilities []string `json:"capabilities"`
}

func main() {
	// Get device credentials from environment or command line
	credsFile := os.Getenv("DEVICE_CREDS")
	if credsFile == "" && len(os.Args) > 1 {
		credsFile = os.Args[1]
	}
	
	if credsFile == "" {
		log.Fatal("Please provide credentials file via DEVICE_CREDS env var or as first argument")
	}

	deviceID := os.Getenv("DEVICE_ID")
	if deviceID == "" {
		deviceID = "example-light-001"
	}

	// Connect to NATS using JWT credentials
	nc, err := nats.Connect(
		nats.DefaultURL,
		nats.UserCredentials(credsFile),
		nats.Name(deviceID),
		nats.ErrorHandler(func(_ *nats.Conn, _ *nats.Subscription, err error) {
			log.Printf("NATS error: %v", err)
		}),
		nats.DisconnectErrHandler(func(_ *nats.Conn, err error) {
			log.Printf("Disconnected: %v", err)
		}),
		nats.ReconnectHandler(func(_ *nats.Conn) {
			log.Println("Reconnected to NATS")
		}),
	)
	if err != nil {
		log.Fatalf("Failed to connect to NATS: %v", err)
	}
	defer nc.Close()

	log.Printf("Connected to NATS as device: %s", deviceID)

	// Current device state
	state := DeviceState{
		State:      "off",
		Brightness: 0,
		UpdatedAt:  time.Now(),
	}

	// Subscribe to commands for this device
	cmdSubject := fmt.Sprintf("home.devices.light.%s.command", deviceID)
	_, err = nc.Subscribe(cmdSubject, func(msg *nats.Msg) {
		log.Printf("Received command: %s", string(msg.Data))
		
		// Parse command (simple on/off for this example)
		var cmd map[string]interface{}
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			log.Printf("Failed to parse command: %v", err)
			return
		}

		// Update state based on command
		if newState, ok := cmd["state"].(string); ok {
			state.State = newState
			if state.State == "on" && state.Brightness == 0 {
				state.Brightness = 100
			} else if state.State == "off" {
				state.Brightness = 0
			}
		}
		
		if brightness, ok := cmd["brightness"].(float64); ok {
			state.Brightness = int(brightness)
			if state.Brightness > 0 {
				state.State = "on"
			}
		}

		state.UpdatedAt = time.Now()

		// Publish updated state
		publishState(nc, deviceID, state)
		
		// Send response if requested
		if msg.Reply != "" {
			response := map[string]interface{}{
				"success": true,
				"state":   state,
			}
			respData, _ := json.Marshal(response)
			msg.Respond(respData)
		}
	})
	if err != nil {
		log.Fatalf("Failed to subscribe to commands: %v", err)
	}

	// Announce device on startup
	announcement := DeviceAnnouncement{
		ID:           deviceID,
		Type:         "light",
		Name:         "Example JWT Light",
		Manufacturer: "NATS Home Automation",
		Model:        "JWT-LIGHT-001",
		Capabilities: []string{"on_off", "brightness"},
	}
	
	announceData, _ := json.Marshal(announcement)
	if err := nc.Publish("home.discovery.announce", announceData); err != nil {
		log.Printf("Failed to announce device: %v", err)
	}

	// Publish initial state
	publishState(nc, deviceID, state)

	// Set up periodic announcements and state updates
	announceTicker := time.NewTicker(30 * time.Second)
	defer announceTicker.Stop()

	stateTicker := time.NewTicker(60 * time.Second)
	defer stateTicker.Stop()

	// Handle shutdown gracefully
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt)

	log.Println("Device running. Press Ctrl+C to exit.")
	
	for {
		select {
		case <-announceTicker.C:
			// Re-announce device
			if err := nc.Publish("home.discovery.announce", announceData); err != nil {
				log.Printf("Failed to announce device: %v", err)
			}
			
		case <-stateTicker.C:
			// Publish current state
			publishState(nc, deviceID, state)
			
		case <-sigCh:
			log.Println("Shutting down...")
			
			// Publish offline message
			offlineMsg := map[string]interface{}{
				"device_id": deviceID,
				"timestamp": time.Now(),
				"reason":    "shutdown",
			}
			offlineData, _ := json.Marshal(offlineMsg)
			nc.Publish(fmt.Sprintf("home.devices.light.%s.offline", deviceID), offlineData)
			nc.Flush()
			
			return
		}
	}
}

func publishState(nc *nats.Conn, deviceID string, state DeviceState) {
	stateSubject := fmt.Sprintf("home.devices.light.%s.state", deviceID)
	stateData, err := json.Marshal(state)
	if err != nil {
		log.Printf("Failed to marshal state: %v", err)
		return
	}
	
	if err := nc.Publish(stateSubject, stateData); err != nil {
		log.Printf("Failed to publish state: %v", err)
	} else {
		log.Printf("Published state: %s", string(stateData))
	}
}