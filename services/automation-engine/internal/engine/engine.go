package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/nats-home-automation/automation-engine/internal/config"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
)

// Engine is the automation engine
type Engine struct {
	config       *config.Config
	natsConn     *nats.Conn
	natsJS       nats.JetStreamContext
	logger       *logrus.Logger
	
	automations  map[string]*Automation
	deviceStates map[string]*DeviceState
	mu           sync.RWMutex
	
	updateTicker *time.Ticker
	evaluator    *Evaluator
}

// New creates a new automation engine
func New(cfg *config.Config, logger *logrus.Logger) (*Engine, error) {
	e := &Engine{
		config:       cfg,
		logger:       logger,
		automations:  make(map[string]*Automation),
		deviceStates: make(map[string]*DeviceState),
	}
	
	e.evaluator = NewEvaluator(e, logger)
	
	return e, nil
}

// Start starts the automation engine
func (e *Engine) Start(ctx context.Context) error {
	// Connect to NATS
	if err := e.connectNATS(); err != nil {
		return fmt.Errorf("failed to connect to NATS: %w", err)
	}
	defer e.natsConn.Close()
	
	// Initialize JetStream
	if err := e.initJetStream(); err != nil {
		return fmt.Errorf("failed to initialize JetStream: %w", err)
	}
	
	// Load automations
	if err := e.loadAutomations(); err != nil {
		return fmt.Errorf("failed to load automations: %w", err)
	}
	
	// Start subscriptions
	if err := e.startSubscriptions(); err != nil {
		return fmt.Errorf("failed to start subscriptions: %w", err)
	}
	
	// Start periodic automation updates
	e.updateTicker = time.NewTicker(time.Duration(e.config.Engine.UpdateInterval) * time.Second)
	go e.periodicUpdate(ctx)
	
	e.logger.Info("Automation engine started")
	
	// Publish service started event
	e.publishEvent("service_started", map[string]interface{}{
		"service": "automation-engine",
		"version": "1.0.0",
	})
	
	// Wait for context cancellation
	<-ctx.Done()
	
	e.updateTicker.Stop()
	e.logger.Info("Automation engine stopped")
	
	// Publish service stopped event
	e.publishEvent("service_stopped", map[string]interface{}{
		"service": "automation-engine",
	})
	
	return nil
}

func (e *Engine) connectNATS() error {
	opts := []nats.Option{
		nats.Name("automation-engine"),
		nats.ReconnectWait(time.Second),
		nats.MaxReconnects(-1),
		nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
			e.logger.Warnf("NATS disconnected: %v", err)
		}),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			e.logger.Info("NATS reconnected")
		}),
	}
	
	if e.config.NATS.Credentials != "" {
		opts = append(opts, nats.UserCredentials(e.config.NATS.Credentials))
	}
	
	conn, err := nats.Connect(e.config.NATS.URL, opts...)
	if err != nil {
		return err
	}
	
	e.natsConn = conn
	e.logger.Info("Connected to NATS server")
	return nil
}

func (e *Engine) initJetStream() error {
	js, err := e.natsConn.JetStream()
	if err != nil {
		return err
	}
	
	e.natsJS = js
	return nil
}

func (e *Engine) loadAutomations() error {
	kv, err := e.natsJS.KeyValue("automations")
	if err != nil {
		return fmt.Errorf("failed to get automations KV store: %w", err)
	}
	
	keys, err := kv.Keys()
	if err != nil {
		return fmt.Errorf("failed to list automation keys: %w", err)
	}
	
	e.mu.Lock()
	defer e.mu.Unlock()
	
	// Clear existing automations
	e.automations = make(map[string]*Automation)
	
	for _, key := range keys {
		entry, err := kv.Get(key)
		if err != nil {
			e.logger.Warnf("Failed to get automation %s: %v", key, err)
			continue
		}
		
		var automation Automation
		if err := json.Unmarshal(entry.Value(), &automation); err != nil {
			e.logger.Warnf("Failed to unmarshal automation %s: %v", key, err)
			continue
		}
		
		if automation.Enabled {
			e.automations[automation.ID] = &automation
			e.logger.Infof("Loaded automation: %s (%s)", automation.Name, automation.ID)
		}
	}
	
	e.logger.Infof("Loaded %d active automations", len(e.automations))
	return nil
}

func (e *Engine) startSubscriptions() error {
	// Subscribe to device state updates
	if _, err := e.natsConn.Subscribe("home.devices.*.*.state", e.handleDeviceState); err != nil {
		return err
	}
	
	// Subscribe to automation events (created, updated, deleted)
	if _, err := e.natsConn.Subscribe("home.automations.events", e.handleAutomationEvent); err != nil {
		return err
	}
	
	// Subscribe to time-based triggers
	if _, err := e.natsConn.Subscribe("home.time.tick", e.handleTimeTick); err != nil {
		return err
	}
	
	e.logger.Info("Started NATS subscriptions")
	return nil
}

func (e *Engine) handleDeviceState(msg *nats.Msg) {
	var state map[string]interface{}
	if err := json.Unmarshal(msg.Data, &state); err != nil {
		e.logger.Errorf("Failed to parse device state: %v", err)
		return
	}
	
	deviceID, ok := state["device_id"].(string)
	if !ok {
		return
	}
	
	// Update device state
	e.mu.Lock()
	deviceState, exists := e.deviceStates[deviceID]
	if !exists {
		deviceState = &DeviceState{
			DeviceID: deviceID,
			State:    make(map[string]interface{}),
		}
		e.deviceStates[deviceID] = deviceState
	}
	
	// Update state fields
	for k, v := range state {
		deviceState.State[k] = v
	}
	deviceState.LastUpdate = time.Now()
	deviceState.Online = true
	e.mu.Unlock()
	
	// Evaluate automations with device state triggers
	e.evaluateDeviceStateTriggers(deviceID, state)
}

func (e *Engine) handleAutomationEvent(msg *nats.Msg) {
	var event map[string]interface{}
	if err := json.Unmarshal(msg.Data, &event); err != nil {
		e.logger.Errorf("Failed to parse automation event: %v", err)
		return
	}
	
	eventType, _ := event["type"].(string)
	automationID, _ := event["automation_id"].(string)
	
	switch eventType {
	case "created", "updated", "enabled":
		// Reload the specific automation
		e.loadAutomation(automationID)
	case "deleted", "disabled":
		// Remove the automation
		e.mu.Lock()
		delete(e.automations, automationID)
		e.mu.Unlock()
		e.logger.Infof("Removed automation: %s", automationID)
	}
}

func (e *Engine) handleTimeTick(msg *nats.Msg) {
	// Evaluate time-based triggers
	e.evaluateTimeTriggers()
}

func (e *Engine) loadAutomation(automationID string) {
	kv, err := e.natsJS.KeyValue("automations")
	if err != nil {
		e.logger.Errorf("Failed to get automations KV store: %v", err)
		return
	}
	
	entry, err := kv.Get(automationID)
	if err != nil {
		e.logger.Warnf("Failed to get automation %s: %v", automationID, err)
		return
	}
	
	var automation Automation
	if err := json.Unmarshal(entry.Value(), &automation); err != nil {
		e.logger.Warnf("Failed to unmarshal automation %s: %v", automationID, err)
		return
	}
	
	e.mu.Lock()
	if automation.Enabled {
		e.automations[automation.ID] = &automation
		e.logger.Infof("Loaded/Updated automation: %s (%s)", automation.Name, automation.ID)
	} else {
		delete(e.automations, automationID)
		e.logger.Infof("Removed disabled automation: %s", automationID)
	}
	e.mu.Unlock()
}

func (e *Engine) evaluateDeviceStateTriggers(deviceID string, state map[string]interface{}) {
	e.mu.RLock()
	automations := make([]*Automation, 0)
	for _, automation := range e.automations {
		// Check if this automation has device state triggers
		for _, trigger := range automation.Triggers {
			if trigger.Type == "device_state" && trigger.DeviceID == deviceID {
				automations = append(automations, automation)
				break
			}
		}
	}
	e.mu.RUnlock()
	
	// Evaluate each relevant automation
	for _, automation := range automations {
		go e.evaluator.EvaluateAutomation(automation, map[string]interface{}{
			"trigger_type": "device_state",
			"device_id":    deviceID,
			"state":        state,
		})
	}
}

func (e *Engine) evaluateTimeTriggers() {
	e.mu.RLock()
	automations := make([]*Automation, 0)
	for _, automation := range e.automations {
		// Check if this automation has time triggers
		for _, trigger := range automation.Triggers {
			if trigger.Type == "time" || trigger.Type == "time_pattern" {
				automations = append(automations, automation)
				break
			}
		}
	}
	e.mu.RUnlock()
	
	// Evaluate each relevant automation
	currentTime := time.Now()
	for _, automation := range automations {
		go e.evaluator.EvaluateAutomation(automation, map[string]interface{}{
			"trigger_type": "time",
			"time":         currentTime,
		})
	}
}

func (e *Engine) periodicUpdate(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-e.updateTicker.C:
			// Reload automations periodically
			if err := e.loadAutomations(); err != nil {
				e.logger.Errorf("Failed to reload automations: %v", err)
			}
		}
	}
}

// ExecuteAction executes an automation action
func (e *Engine) ExecuteAction(action Action) error {
	switch action.Type {
	case "device_command":
		return e.executeDeviceCommand(action)
	case "scene_activate":
		return e.executeSceneActivation(action)
	case "notification":
		return e.executeNotification(action)
	default:
		return fmt.Errorf("unknown action type: %s", action.Type)
	}
}

func (e *Engine) executeDeviceCommand(action Action) error {
	if action.DeviceID == "" {
		return fmt.Errorf("device_id is required for device_command action")
	}
	
	// Get device info to determine the subject
	e.mu.RLock()
	deviceState, exists := e.deviceStates[action.DeviceID]
	e.mu.RUnlock()
	
	deviceType := "unknown"
	if exists && deviceState.Type != "" {
		deviceType = deviceState.Type
	}
	
	// Build NATS subject
	subject := fmt.Sprintf("home.devices.%s.%s.command", deviceType, action.DeviceID)
	
	// Build command payload
	payload := map[string]interface{}{
		"device_id": action.DeviceID,
		"command":   action.Command,
		"timestamp": time.Now().Unix(),
	}
	
	// Add any additional data
	for k, v := range action.Data {
		payload[k] = v
	}
	
	// Publish command
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal command: %w", err)
	}
	
	if err := e.natsConn.Publish(subject, data); err != nil {
		return fmt.Errorf("failed to publish command: %w", err)
	}
	
	e.logger.Infof("Executed device command: %s -> %s", action.DeviceID, action.Command)
	return nil
}

func (e *Engine) executeSceneActivation(action Action) error {
	if action.Scene == "" {
		return fmt.Errorf("scene is required for scene_activate action")
	}
	
	// Publish scene activation request
	payload := map[string]interface{}{
		"scene_id":  action.Scene,
		"timestamp": time.Now().Unix(),
	}
	
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal scene activation: %w", err)
	}
	
	subject := fmt.Sprintf("home.scenes.%s.activate", action.Scene)
	if err := e.natsConn.Publish(subject, data); err != nil {
		return fmt.Errorf("failed to publish scene activation: %w", err)
	}
	
	e.logger.Infof("Activated scene: %s", action.Scene)
	return nil
}

func (e *Engine) executeNotification(action Action) error {
	// Publish notification
	payload := map[string]interface{}{
		"message":   action.Data["message"],
		"title":     action.Data["title"],
		"priority":  action.Data["priority"],
		"timestamp": time.Now().Unix(),
	}
	
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}
	
	if err := e.natsConn.Publish("home.notifications.send", data); err != nil {
		return fmt.Errorf("failed to publish notification: %w", err)
	}
	
	e.logger.Infof("Sent notification: %s", action.Data["title"])
	return nil
}

// publishEvent publishes a system event
func (e *Engine) publishEvent(eventType string, data interface{}) {
	event := map[string]interface{}{
		"timestamp":  time.Now().Format(time.RFC3339),
		"event_type": eventType,
		"data":       data,
	}
	payload, _ := json.Marshal(event)
	e.natsConn.Publish(fmt.Sprintf("home.events.system.%s", eventType), payload)
}