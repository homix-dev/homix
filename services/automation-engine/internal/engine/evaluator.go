package engine

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// Evaluator evaluates automation triggers and conditions
type Evaluator struct {
	engine *Engine
	logger *logrus.Logger
}

// NewEvaluator creates a new evaluator
func NewEvaluator(engine *Engine, logger *logrus.Logger) *Evaluator {
	return &Evaluator{
		engine: engine,
		logger: logger,
	}
}

// EvaluateAutomation evaluates an automation
func (e *Evaluator) EvaluateAutomation(automation *Automation, context map[string]interface{}) {
	if e.engine.config.Engine.DebugEvaluation {
		e.logger.Debugf("Evaluating automation: %s (%s) with context: %+v", 
			automation.Name, automation.ID, context)
	}
	
	// Check if any trigger matches
	triggerMatched := false
	for _, trigger := range automation.Triggers {
		if e.evaluateTrigger(trigger, context) {
			triggerMatched = true
			break
		}
	}
	
	if !triggerMatched {
		if e.engine.config.Engine.DebugEvaluation {
			e.logger.Debugf("No triggers matched for automation: %s", automation.Name)
		}
		return
	}
	
	// Check all conditions
	for _, condition := range automation.Conditions {
		if !e.evaluateCondition(condition) {
			if e.engine.config.Engine.DebugEvaluation {
				e.logger.Debugf("Condition not met for automation: %s", automation.Name)
			}
			return
		}
	}
	
	// All triggers and conditions passed, execute actions
	e.logger.Infof("Executing automation: %s (%s)", automation.Name, automation.ID)
	
	// Execute actions
	for i, action := range automation.Actions {
		// Handle delay
		if action.Delay > 0 {
			time.Sleep(time.Duration(action.Delay) * time.Second)
		}
		
		if err := e.engine.ExecuteAction(action); err != nil {
			e.logger.Errorf("Failed to execute action %d for automation %s: %v", 
				i, automation.Name, err)
		}
	}
	
	// Update automation run info
	e.updateAutomationRunInfo(automation)
}

func (e *Evaluator) evaluateTrigger(trigger Trigger, context map[string]interface{}) bool {
	triggerType, _ := context["trigger_type"].(string)
	
	switch trigger.Type {
	case "device_state":
		if triggerType != "device_state" {
			return false
		}
		
		deviceID, _ := context["device_id"].(string)
		if trigger.DeviceID != deviceID {
			return false
		}
		
		state, _ := context["state"].(map[string]interface{})
		return e.evaluateDeviceStateTrigger(trigger, state)
		
	case "time":
		if triggerType != "time" {
			return false
		}
		return e.evaluateTimeTrigger(trigger, context)
		
	case "event":
		if triggerType != "event" {
			return false
		}
		return e.evaluateEventTrigger(trigger, context)
		
	default:
		e.logger.Warnf("Unknown trigger type: %s", trigger.Type)
		return false
	}
}

func (e *Evaluator) evaluateDeviceStateTrigger(trigger Trigger, state map[string]interface{}) bool {
	if trigger.Attribute == "" {
		return false
	}
	
	// Get the attribute value from state
	value, exists := state[trigger.Attribute]
	if !exists {
		return false
	}
	
	// Check for exact value match
	if trigger.Value != nil {
		return e.compareValues(value, trigger.Value)
	}
	
	// Check for numeric comparisons
	numValue, err := e.toFloat64(value)
	if err == nil {
		if trigger.Above > 0 && numValue <= trigger.Above {
			return false
		}
		if trigger.Below > 0 && numValue >= trigger.Below {
			return false
		}
	}
	
	return true
}

func (e *Evaluator) evaluateTimeTrigger(trigger Trigger, context map[string]interface{}) bool {
	currentTime, _ := context["time"].(time.Time)
	if currentTime.IsZero() {
		currentTime = time.Now()
	}
	
	if trigger.Time != "" {
		// Parse time in HH:MM format
		parts := strings.Split(trigger.Time, ":")
		if len(parts) != 2 {
			return false
		}
		
		hour, err1 := strconv.Atoi(parts[0])
		minute, err2 := strconv.Atoi(parts[1])
		if err1 != nil || err2 != nil {
			return false
		}
		
		// Check if current time matches (within a minute)
		if currentTime.Hour() == hour && currentTime.Minute() == minute {
			return true
		}
	}
	
	return false
}

func (e *Evaluator) evaluateEventTrigger(trigger Trigger, context map[string]interface{}) bool {
	event, _ := context["event"].(string)
	return trigger.Event == event
}

func (e *Evaluator) evaluateCondition(condition Condition) bool {
	switch condition.Type {
	case "device_state":
		return e.evaluateDeviceStateCondition(condition)
	case "time":
		return e.evaluateTimeCondition(condition)
	case "numeric_state":
		return e.evaluateNumericStateCondition(condition)
	default:
		e.logger.Warnf("Unknown condition type: %s", condition.Type)
		return true // Unknown conditions pass by default
	}
}

func (e *Evaluator) evaluateDeviceStateCondition(condition Condition) bool {
	if condition.DeviceID == "" || condition.Attribute == "" {
		return false
	}
	
	// Get device state
	e.engine.mu.RLock()
	deviceState, exists := e.engine.deviceStates[condition.DeviceID]
	e.engine.mu.RUnlock()
	
	if !exists || deviceState.State == nil {
		return false
	}
	
	// Get attribute value
	value, exists := deviceState.State[condition.Attribute]
	if !exists {
		return false
	}
	
	// Check value
	if condition.Value != nil {
		return e.compareValues(value, condition.Value)
	}
	
	return true
}

func (e *Evaluator) evaluateTimeCondition(condition Condition) bool {
	now := time.Now()
	
	// Check time range
	if condition.After != "" || condition.Before != "" {
		currentMinutes := now.Hour()*60 + now.Minute()
		
		if condition.After != "" {
			afterMinutes := e.parseTime(condition.After)
			if currentMinutes < afterMinutes {
				return false
			}
		}
		
		if condition.Before != "" {
			beforeMinutes := e.parseTime(condition.Before)
			if currentMinutes >= beforeMinutes {
				return false
			}
		}
	}
	
	// Check weekday
	if len(condition.Weekday) > 0 {
		currentWeekday := strings.ToLower(now.Weekday().String())
		found := false
		for _, weekday := range condition.Weekday {
			if strings.ToLower(weekday) == currentWeekday {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	
	return true
}

func (e *Evaluator) evaluateNumericStateCondition(condition Condition) bool {
	if condition.DeviceID == "" || condition.Attribute == "" {
		return false
	}
	
	// Get device state
	e.engine.mu.RLock()
	deviceState, exists := e.engine.deviceStates[condition.DeviceID]
	e.engine.mu.RUnlock()
	
	if !exists || deviceState.State == nil {
		return false
	}
	
	// Get attribute value
	value, exists := deviceState.State[condition.Attribute]
	if !exists {
		return false
	}
	
	// Convert to float
	numValue, err := e.toFloat64(value)
	if err != nil {
		return false
	}
	
	// Check numeric conditions
	if condition.Above > 0 && numValue <= condition.Above {
		return false
	}
	if condition.Below > 0 && numValue >= condition.Below {
		return false
	}
	
	return true
}

func (e *Evaluator) compareValues(a, b interface{}) bool {
	// Handle nil values
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	
	// Try direct comparison
	if a == b {
		return true
	}
	
	// Try string comparison
	aStr := fmt.Sprintf("%v", a)
	bStr := fmt.Sprintf("%v", b)
	if aStr == bStr {
		return true
	}
	
	// Try numeric comparison
	aNum, err1 := e.toFloat64(a)
	bNum, err2 := e.toFloat64(b)
	if err1 == nil && err2 == nil {
		return aNum == bNum
	}
	
	// Try boolean comparison
	aBool, err1 := e.toBool(a)
	bBool, err2 := e.toBool(b)
	if err1 == nil && err2 == nil {
		return aBool == bBool
	}
	
	return false
}

func (e *Evaluator) toFloat64(value interface{}) (float64, error) {
	switch v := value.(type) {
	case float64:
		return v, nil
	case float32:
		return float64(v), nil
	case int:
		return float64(v), nil
	case int64:
		return float64(v), nil
	case string:
		return strconv.ParseFloat(v, 64)
	default:
		return 0, fmt.Errorf("cannot convert %T to float64", value)
	}
}

func (e *Evaluator) toBool(value interface{}) (bool, error) {
	switch v := value.(type) {
	case bool:
		return v, nil
	case string:
		return strconv.ParseBool(v)
	case int:
		return v != 0, nil
	case float64:
		return v != 0, nil
	default:
		return false, fmt.Errorf("cannot convert %T to bool", value)
	}
}

func (e *Evaluator) parseTime(timeStr string) int {
	parts := strings.Split(timeStr, ":")
	if len(parts) != 2 {
		return 0
	}
	
	hour, err1 := strconv.Atoi(parts[0])
	minute, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil {
		return 0
	}
	
	return hour*60 + minute
}

func (e *Evaluator) updateAutomationRunInfo(automation *Automation) {
	automation.LastRun = time.Now()
	automation.RunCount++
	
	// Update in KV store
	kv, err := e.engine.natsJS.KeyValue("automations")
	if err != nil {
		e.logger.Errorf("Failed to get automations KV store: %v", err)
		return
	}
	
	data, err := json.Marshal(automation)
	if err != nil {
		e.logger.Errorf("Failed to marshal automation: %v", err)
		return
	}
	
	if _, err := kv.Put(automation.ID, data); err != nil {
		e.logger.Errorf("Failed to update automation run info: %v", err)
	}
}