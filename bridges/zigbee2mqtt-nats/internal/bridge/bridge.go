package bridge

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
)

// Bridge connects Zigbee2MQTT to NATS
type Bridge struct {
	config      *Config
	mqttClient  mqtt.Client
	natsConn    *nats.Conn
	deviceMap   map[string]*Device
	deviceMutex sync.RWMutex
	ctx         context.Context
	cancel      context.CancelFunc
	logger      *logrus.Logger
}

// Device represents a Zigbee device
type Device struct {
	IEEE            string                 `json:"ieee_address"`
	FriendlyName    string                 `json:"friendly_name"`
	Type            string                 `json:"type"`
	NetworkAddress  uint16                 `json:"network_address"`
	Supported       bool                   `json:"supported"`
	Definition      map[string]interface{} `json:"definition"`
	PowerSource     string                 `json:"power_source"`
	DateCode        string                 `json:"date_code"`
	ModelID         string                 `json:"model_id"`
	ManufacturerID  uint16                 `json:"manufacturer_id"`
	Manufacturer    string                 `json:"manufacturer"`
	Model           string                 `json:"model"`
	LastSeen        time.Time              `json:"last_seen"`
	LinkQuality     int                    `json:"link_quality"`
}

// New creates a new bridge instance
func New(config *Config) (*Bridge, error) {
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)
	
	ctx, cancel := context.WithCancel(context.Background())
	
	return &Bridge{
		config:    config,
		deviceMap: make(map[string]*Device),
		ctx:       ctx,
		cancel:    cancel,
		logger:    logger,
	}, nil
}

// Start starts the bridge
func (b *Bridge) Start() error {
	// Connect to MQTT
	if err := b.connectMQTT(); err != nil {
		return fmt.Errorf("failed to connect to MQTT: %w", err)
	}

	// Connect to NATS
	if err := b.connectNATS(); err != nil {
		return fmt.Errorf("failed to connect to NATS: %w", err)
	}

	// Subscribe to topics
	if err := b.subscribe(); err != nil {
		return fmt.Errorf("failed to subscribe: %w", err)
	}

	b.logger.Info("Bridge started successfully")

	// Wait for context cancellation
	<-b.ctx.Done()

	// Cleanup
	b.cleanup()

	return nil
}

// Stop stops the bridge
func (b *Bridge) Stop() {
	b.cancel()
}

func (b *Bridge) connectMQTT() error {
	opts := mqtt.NewClientOptions()
	opts.AddBroker(b.config.MQTT.Broker)
	opts.SetClientID(b.config.MQTT.ClientID)
	
	if b.config.MQTT.Username != "" {
		opts.SetUsername(b.config.MQTT.Username)
		opts.SetPassword(b.config.MQTT.Password)
	}

	opts.SetDefaultPublishHandler(b.handleMQTTMessage)
	opts.SetOnConnectHandler(func(client mqtt.Client) {
		b.logger.Info("Connected to MQTT broker")
	})
	opts.SetConnectionLostHandler(func(client mqtt.Client, err error) {
		b.logger.Errorf("MQTT connection lost: %v", err)
	})

	b.mqttClient = mqtt.NewClient(opts)
	token := b.mqttClient.Connect()
	if token.Wait() && token.Error() != nil {
		return token.Error()
	}

	return nil
}

func (b *Bridge) connectNATS() error {
	opts := []nats.Option{
		nats.Name("zigbee2mqtt-bridge"),
		nats.ReconnectWait(time.Second),
		nats.MaxReconnects(-1),
	}

	if b.config.NATS.Credentials != "" {
		opts = append(opts, nats.UserCredentials(b.config.NATS.Credentials))
	}

	conn, err := nats.Connect(b.config.NATS.URL, opts...)
	if err != nil {
		return err
	}

	b.natsConn = conn
	b.logger.Info("Connected to NATS server")
	
	return nil
}

func (b *Bridge) subscribe() error {
	// Subscribe to Zigbee2MQTT topics
	topics := []string{
		fmt.Sprintf("%s/+", b.config.MQTT.BaseTopic),           // Device state updates
		fmt.Sprintf("%s/bridge/state", b.config.MQTT.BaseTopic), // Bridge state
		fmt.Sprintf("%s/bridge/devices", b.config.MQTT.BaseTopic), // Device list
		fmt.Sprintf("%s/bridge/event", b.config.MQTT.BaseTopic),   // Events
	}

	for _, topic := range topics {
		token := b.mqttClient.Subscribe(topic, 0, nil)
		if token.Wait() && token.Error() != nil {
			return fmt.Errorf("failed to subscribe to %s: %w", topic, token.Error())
		}
		b.logger.Infof("Subscribed to MQTT topic: %s", topic)
	}

	// Subscribe to NATS commands
	sub, err := b.natsConn.Subscribe(fmt.Sprintf("%s.*.command", b.config.NATS.BaseSubject), b.handleNATSCommand)
	if err != nil {
		return fmt.Errorf("failed to subscribe to NATS commands: %w", err)
	}
	b.logger.Infof("Subscribed to NATS subject: %s", sub.Subject)

	// Request device list on startup
	b.mqttClient.Publish(fmt.Sprintf("%s/bridge/devices/get", b.config.MQTT.BaseTopic), 0, false, "{}")

	return nil
}

func (b *Bridge) handleMQTTMessage(client mqtt.Client, msg mqtt.Message) {
	topic := msg.Topic()
	payload := msg.Payload()

	b.logger.Debugf("MQTT message received - Topic: %s, Payload: %s", topic, string(payload))

	// Parse topic
	parts := strings.Split(topic, "/")
	if len(parts) < 2 {
		return
	}

	baseTopic := parts[0]
	if baseTopic != b.config.MQTT.BaseTopic {
		return
	}

	// Handle different message types
	switch {
	case len(parts) == 2:
		// Device state update: zigbee2mqtt/device_name
		b.handleDeviceState(parts[1], payload)

	case len(parts) >= 3 && parts[1] == "bridge":
		switch parts[2] {
		case "state":
			b.handleBridgeState(payload)
		case "devices":
			b.handleDeviceList(payload)
		case "event":
			b.handleBridgeEvent(payload)
		}
	}
}

func (b *Bridge) handleDeviceState(deviceName string, payload []byte) {
	// Parse state
	var state map[string]interface{}
	if err := json.Unmarshal(payload, &state); err != nil {
		b.logger.Errorf("Failed to parse device state: %v", err)
		return
	}

	// Get device info
	b.deviceMutex.RLock()
	device, exists := b.deviceMap[deviceName]
	b.deviceMutex.RUnlock()

	if !exists {
		b.logger.Warnf("Unknown device: %s", deviceName)
		return
	}

	// Determine device type and build NATS subject
	deviceType := b.getDeviceType(device)
	subject := fmt.Sprintf("%s.%s.%s.state", b.config.NATS.BaseSubject, deviceType, deviceName)

	// Add metadata
	state["device_id"] = deviceName
	state["ieee_address"] = device.IEEE
	state["manufacturer"] = device.Manufacturer
	state["model"] = device.Model
	state["timestamp"] = time.Now().Unix()

	// Publish to NATS
	data, err := json.Marshal(state)
	if err != nil {
		b.logger.Errorf("Failed to marshal state: %v", err)
		return
	}

	if err := b.natsConn.Publish(subject, data); err != nil {
		b.logger.Errorf("Failed to publish to NATS: %v", err)
		return
	}

	b.logger.Debugf("Published device state to NATS: %s", subject)
}

func (b *Bridge) handleBridgeState(payload []byte) {
	var state map[string]interface{}
	if err := json.Unmarshal(payload, &state); err != nil {
		b.logger.Errorf("Failed to parse bridge state: %v", err)
		return
	}

	subject := fmt.Sprintf("%s.bridge.state", b.config.NATS.BaseSubject)
	
	if err := b.natsConn.Publish(subject, payload); err != nil {
		b.logger.Errorf("Failed to publish bridge state: %v", err)
		return
	}

	b.logger.Infof("Bridge state: %v", state["state"])
}

func (b *Bridge) handleDeviceList(payload []byte) {
	var devices []Device
	if err := json.Unmarshal(payload, &devices); err != nil {
		b.logger.Errorf("Failed to parse device list: %v", err)
		return
	}

	// Update device map
	b.deviceMutex.Lock()
	for _, device := range devices {
		if device.FriendlyName != "" {
			b.deviceMap[device.FriendlyName] = &device
		}
	}
	b.deviceMutex.Unlock()

	b.logger.Infof("Updated device list: %d devices", len(devices))

	// Publish device list to NATS
	subject := fmt.Sprintf("%s.devices", b.config.NATS.BaseSubject)
	if err := b.natsConn.Publish(subject, payload); err != nil {
		b.logger.Errorf("Failed to publish device list: %v", err)
	}

	// Announce each device
	for _, device := range devices {
		b.announceDevice(&device)
	}
}

func (b *Bridge) handleBridgeEvent(payload []byte) {
	var event map[string]interface{}
	if err := json.Unmarshal(payload, &event); err != nil {
		b.logger.Errorf("Failed to parse bridge event: %v", err)
		return
	}

	subject := fmt.Sprintf("%s.bridge.event", b.config.NATS.BaseSubject)
	
	if err := b.natsConn.Publish(subject, payload); err != nil {
		b.logger.Errorf("Failed to publish bridge event: %v", err)
		return
	}

	b.logger.Debugf("Bridge event: %v", event["type"])
}

func (b *Bridge) handleNATSCommand(msg *nats.Msg) {
	// Parse subject to get device name
	parts := strings.Split(msg.Subject, ".")
	if len(parts) < 4 {
		b.logger.Errorf("Invalid command subject: %s", msg.Subject)
		return
	}

	deviceName := parts[len(parts)-2]

	// Parse command
	var cmd map[string]interface{}
	if err := json.Unmarshal(msg.Data, &cmd); err != nil {
		b.logger.Errorf("Failed to parse command: %v", err)
		return
	}

	// Convert NATS command to Zigbee2MQTT format
	mqttTopic := fmt.Sprintf("%s/%s/set", b.config.MQTT.BaseTopic, deviceName)
	
	// Remove metadata fields
	delete(cmd, "device_id")
	delete(cmd, "timestamp")

	// Publish to MQTT
	data, err := json.Marshal(cmd)
	if err != nil {
		b.logger.Errorf("Failed to marshal command: %v", err)
		return
	}

	token := b.mqttClient.Publish(mqttTopic, 0, false, data)
	if token.Wait() && token.Error() != nil {
		b.logger.Errorf("Failed to publish command to MQTT: %v", token.Error())
		return
	}

	b.logger.Infof("Sent command to device %s: %v", deviceName, cmd)

	// Send response if requested
	if msg.Reply != "" {
		resp := map[string]interface{}{
			"status": "sent",
			"device": deviceName,
		}
		respData, _ := json.Marshal(resp)
		b.natsConn.Publish(msg.Reply, respData)
	}
}

func (b *Bridge) announceDevice(device *Device) {
	deviceType := b.getDeviceType(device)
	subject := fmt.Sprintf("%s.%s.%s.announce", b.config.NATS.BaseSubject, deviceType, device.FriendlyName)

	announcement := map[string]interface{}{
		"device_id":       device.FriendlyName,
		"ieee_address":    device.IEEE,
		"type":            deviceType,
		"manufacturer":    device.Manufacturer,
		"model":           device.Model,
		"power_source":    device.PowerSource,
		"supported":       device.Supported,
		"network_address": device.NetworkAddress,
		"features":        b.getDeviceFeatures(device),
	}

	data, err := json.Marshal(announcement)
	if err != nil {
		b.logger.Errorf("Failed to marshal announcement: %v", err)
		return
	}

	if err := b.natsConn.Publish(subject, data); err != nil {
		b.logger.Errorf("Failed to announce device: %v", err)
		return
	}

	b.logger.Debugf("Announced device: %s", device.FriendlyName)
}

func (b *Bridge) getDeviceType(device *Device) string {
	// Determine device type based on definition
	if device.Definition == nil {
		return "unknown"
	}

	// Check exposes array
	if exposes, ok := device.Definition["exposes"].([]interface{}); ok {
		for _, expose := range exposes {
			if exposeMap, ok := expose.(map[string]interface{}); ok {
				if feature, ok := exposeMap["type"].(string); ok {
					switch feature {
					case "switch":
						return "switch"
					case "light":
						return "light"
					case "lock":
						return "lock"
					case "climate":
						return "climate"
					case "cover":
						return "cover"
					}
				}
				// Check features
				if features, ok := exposeMap["features"].([]interface{}); ok {
					for _, f := range features {
						if fm, ok := f.(map[string]interface{}); ok {
							if property, ok := fm["property"].(string); ok {
								switch property {
								case "temperature", "humidity", "pressure":
									return "sensor"
								case "occupancy", "contact", "water_leak":
									return "binary_sensor"
								}
							}
						}
					}
				}
			}
		}
	}

	// Default to sensor
	return "sensor"
}

func (b *Bridge) getDeviceFeatures(device *Device) []string {
	features := []string{}
	
	if device.Definition == nil {
		return features
	}

	// Extract features from exposes
	if exposes, ok := device.Definition["exposes"].([]interface{}); ok {
		for _, expose := range exposes {
			if exposeMap, ok := expose.(map[string]interface{}); ok {
				if property, ok := exposeMap["property"].(string); ok {
					features = append(features, property)
				}
				// Check nested features
				if nestedFeatures, ok := exposeMap["features"].([]interface{}); ok {
					for _, f := range nestedFeatures {
						if fm, ok := f.(map[string]interface{}); ok {
							if property, ok := fm["property"].(string); ok {
								features = append(features, property)
							}
						}
					}
				}
			}
		}
	}

	return features
}

func (b *Bridge) cleanup() {
	if b.mqttClient != nil && b.mqttClient.IsConnected() {
		b.mqttClient.Disconnect(250)
		b.logger.Info("Disconnected from MQTT")
	}

	if b.natsConn != nil {
		b.natsConn.Close()
		b.logger.Info("Disconnected from NATS")
	}
}