package configmgr

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/calmera/nats-home-automation/services/discovery/internal/models"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/sirupsen/logrus"
)

// Manager handles device and system configuration
type Manager struct {
	js       jetstream.JetStream
	deviceKV jetstream.KeyValue
	systemKV jetstream.KeyValue
	schemaKV jetstream.KeyValue
	log      *logrus.Logger
	schemas  map[string]models.ConfigSchema
}

// New creates a new configuration manager
func New(js jetstream.JetStream, log *logrus.Logger) (*Manager, error) {
	// Create KV buckets for different config types
	deviceKV, err := createOrGetKV(js, "device_configs", "Device-specific configurations")
	if err != nil {
		return nil, fmt.Errorf("failed to create device_configs KV: %w", err)
	}

	systemKV, err := createOrGetKV(js, "system_configs", "System-wide configurations")
	if err != nil {
		return nil, fmt.Errorf("failed to create system_configs KV: %w", err)
	}

	schemaKV, err := createOrGetKV(js, "config_schemas", "Configuration validation schemas")
	if err != nil {
		return nil, fmt.Errorf("failed to create config_schemas KV: %w", err)
	}

	m := &Manager{
		js:       js,
		deviceKV: deviceKV,
		systemKV: systemKV,
		schemaKV: schemaKV,
		log:      log,
		schemas:  make(map[string]models.ConfigSchema),
	}

	// Load default schemas
	if err := m.loadDefaultSchemas(); err != nil {
		log.Warnf("Failed to load default schemas: %v", err)
	}

	return m, nil
}

// GetDeviceConfig retrieves configuration for a specific device
func (m *Manager) GetDeviceConfig(deviceID string) (*models.DeviceConfig, error) {
	key := fmt.Sprintf("device.%s", deviceID)
	entry, err := m.deviceKV.Get(context.Background(), key)
	if err != nil {
		if err == jetstream.ErrKeyNotFound {
			return nil, fmt.Errorf("config not found for device: %s", deviceID)
		}
		return nil, fmt.Errorf("failed to get device config: %w", err)
	}

	var config models.DeviceConfig
	if err := json.Unmarshal(entry.Value(), &config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &config, nil
}

// SetDeviceConfig stores or updates device configuration
func (m *Manager) SetDeviceConfig(config *models.DeviceConfig, deviceType string) error {
	if err := config.Validate(); err != nil {
		return fmt.Errorf("invalid config: %w", err)
	}

	// Apply defaults based on device type
	config.ApplyDefaults(deviceType)

	// Validate against schema if available
	if schema, ok := m.schemas[deviceType]; ok {
		if err := m.validateConfig(config.Settings, schema); err != nil {
			return fmt.Errorf("config validation failed: %w", err)
		}
	}

	// Update metadata
	config.UpdatedAt = time.Now()
	config.Version++

	// Serialize
	data, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	// Store
	key := fmt.Sprintf("device.%s", config.DeviceID)
	if _, err := m.deviceKV.Put(context.Background(), key, data); err != nil {
		return fmt.Errorf("failed to store config: %w", err)
	}

	m.log.Infof("Updated config for device: %s", config.DeviceID)
	return nil
}

// DeleteDeviceConfig removes device configuration
func (m *Manager) DeleteDeviceConfig(deviceID string) error {
	key := fmt.Sprintf("device.%s", deviceID)
	if err := m.deviceKV.Delete(context.Background(), key); err != nil {
		if err != jetstream.ErrKeyNotFound {
			return fmt.Errorf("failed to delete config: %w", err)
		}
	}
	m.log.Infof("Deleted config for device: %s", deviceID)
	return nil
}

// GetSystemConfig retrieves system-wide configuration
func (m *Manager) GetSystemConfig(component string) (*models.SystemConfig, error) {
	key := fmt.Sprintf("system.%s", component)
	entry, err := m.systemKV.Get(context.Background(), key)
	if err != nil {
		if err == jetstream.ErrKeyNotFound {
			return nil, fmt.Errorf("config not found for component: %s", component)
		}
		return nil, fmt.Errorf("failed to get system config: %w", err)
	}

	var config models.SystemConfig
	if err := json.Unmarshal(entry.Value(), &config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &config, nil
}

// SetSystemConfig stores or updates system configuration
func (m *Manager) SetSystemConfig(config *models.SystemConfig) error {
	if config.Component == "" {
		return fmt.Errorf("component name is required")
	}

	// Update metadata
	config.UpdatedAt = time.Now()
	config.Version++

	// Serialize
	data, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	// Store
	key := fmt.Sprintf("system.%s", config.Component)
	if _, err := m.systemKV.Put(context.Background(), key, data); err != nil {
		return fmt.Errorf("failed to store config: %w", err)
	}

	m.log.Infof("Updated system config for: %s", config.Component)
	return nil
}

// ListDeviceConfigs returns all device configurations
func (m *Manager) ListDeviceConfigs() ([]*models.DeviceConfig, error) {
	keys, err := m.deviceKV.Keys(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to list keys: %w", err)
	}

	configs := make([]*models.DeviceConfig, 0, len(keys))
	for _, key := range keys {
		if !strings.HasPrefix(key, "device.") {
			continue
		}

		entry, err := m.deviceKV.Get(context.Background(), key)
		if err != nil {
			m.log.Warnf("Failed to get config %s: %v", key, err)
			continue
		}

		var config models.DeviceConfig
		if err := json.Unmarshal(entry.Value(), &config); err != nil {
			m.log.Warnf("Failed to unmarshal config %s: %v", key, err)
			continue
		}

		configs = append(configs, &config)
	}

	return configs, nil
}

// CreateBackup creates a backup of all configurations
func (m *Manager) CreateBackup(description string) (*models.ConfigBackup, error) {
	backup := &models.ConfigBackup{
		ID:            fmt.Sprintf("backup-%d", time.Now().Unix()),
		Description:   description,
		DeviceConfigs: make(map[string]models.DeviceConfig),
		SystemConfigs: make(map[string]models.SystemConfig),
		CreatedAt:     time.Now(),
	}

	// Backup device configs
	deviceKeys, err := m.deviceKV.Keys(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to list device keys: %w", err)
	}

	for _, key := range deviceKeys {
		entry, err := m.deviceKV.Get(context.Background(), key)
		if err != nil {
			m.log.Warnf("Failed to backup %s: %v", key, err)
			continue
		}

		var config models.DeviceConfig
		if err := json.Unmarshal(entry.Value(), &config); err != nil {
			continue
		}

		backup.DeviceConfigs[config.DeviceID] = config
		backup.Size += int64(len(entry.Value()))
	}

	// Backup system configs
	systemKeys, err := m.systemKV.Keys(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to list system keys: %w", err)
	}

	for _, key := range systemKeys {
		entry, err := m.systemKV.Get(context.Background(), key)
		if err != nil {
			m.log.Warnf("Failed to backup %s: %v", key, err)
			continue
		}

		var config models.SystemConfig
		if err := json.Unmarshal(entry.Value(), &config); err != nil {
			continue
		}

		backup.SystemConfigs[config.Component] = config
		backup.Size += int64(len(entry.Value()))
	}

	// Store backup
	backupData, err := json.Marshal(backup)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal backup: %w", err)
	}

	// Create backup bucket if needed
	backupKV, err := createOrGetKV(m.js, "config_backups", "Configuration backups")
	if err != nil {
		return nil, fmt.Errorf("failed to create backup bucket: %w", err)
	}

	if _, err := backupKV.Put(context.Background(), backup.ID, backupData); err != nil {
		return nil, fmt.Errorf("failed to store backup: %w", err)
	}

	m.log.Infof("Created backup: %s (%d configs, %d bytes)", backup.ID, 
		len(backup.DeviceConfigs)+len(backup.SystemConfigs), backup.Size)

	return backup, nil
}

// RestoreBackup restores configurations from a backup
func (m *Manager) RestoreBackup(backupID string) error {
	backupKV, err := m.js.KeyValue(context.Background(), "config_backups")
	if err != nil {
		return fmt.Errorf("failed to get backup bucket: %w", err)
	}

	entry, err := backupKV.Get(context.Background(), backupID)
	if err != nil {
		return fmt.Errorf("backup not found: %s", backupID)
	}

	var backup models.ConfigBackup
	if err := json.Unmarshal(entry.Value(), &backup); err != nil {
		return fmt.Errorf("failed to unmarshal backup: %w", err)
	}

	// Restore device configs
	for _, config := range backup.DeviceConfigs {
		configCopy := config // Create copy to avoid pointer issues
		if err := m.SetDeviceConfig(&configCopy, ""); err != nil {
			m.log.Warnf("Failed to restore device config %s: %v", config.DeviceID, err)
		}
	}

	// Restore system configs
	for _, config := range backup.SystemConfigs {
		configCopy := config // Create copy to avoid pointer issues
		if err := m.SetSystemConfig(&configCopy); err != nil {
			m.log.Warnf("Failed to restore system config %s: %v", config.Component, err)
		}
	}

	m.log.Infof("Restored backup: %s (%d configs)", backupID, 
		len(backup.DeviceConfigs)+len(backup.SystemConfigs))

	return nil
}

// SetConfigSchema stores a configuration schema for validation
func (m *Manager) SetConfigSchema(deviceType string, schema models.ConfigSchema) error {
	data, err := json.Marshal(schema)
	if err != nil {
		return fmt.Errorf("failed to marshal schema: %w", err)
	}

	key := fmt.Sprintf("schema.%s", deviceType)
	if _, err := m.schemaKV.Put(context.Background(), key, data); err != nil {
		return fmt.Errorf("failed to store schema: %w", err)
	}

	// Update cache
	m.schemas[deviceType] = schema
	m.log.Infof("Updated schema for device type: %s", deviceType)
	return nil
}

// validateConfig validates configuration against schema
func (m *Manager) validateConfig(settings map[string]interface{}, schema models.ConfigSchema) error {
	// Check required fields
	for _, required := range schema.Required {
		if _, ok := settings[required]; !ok {
			return fmt.Errorf("required field missing: %s", required)
		}
	}

	// Validate each field
	for fieldName, fieldSchema := range schema.Fields {
		value, exists := settings[fieldName]
		if !exists {
			if fieldSchema.Required {
				return fmt.Errorf("required field missing: %s", fieldName)
			}
			continue
		}

		// Type validation
		if err := validateFieldType(value, fieldSchema); err != nil {
			return fmt.Errorf("field %s: %w", fieldName, err)
		}
	}

	return nil
}

// validateFieldType validates a field value against its schema
func validateFieldType(value interface{}, schema models.FieldSchema) error {
	switch schema.Type {
	case "string":
		str, ok := value.(string)
		if !ok {
			return fmt.Errorf("expected string, got %T", value)
		}
		if len(schema.Enum) > 0 {
			valid := false
			for _, allowed := range schema.Enum {
				if str == allowed {
					valid = true
					break
				}
			}
			if !valid {
				return fmt.Errorf("value must be one of: %v", schema.Enum)
			}
		}

	case "number":
		num, ok := toFloat64(value)
		if !ok {
			return fmt.Errorf("expected number, got %T", value)
		}
		if schema.Min != nil && num < *schema.Min {
			return fmt.Errorf("value must be >= %v", *schema.Min)
		}
		if schema.Max != nil && num > *schema.Max {
			return fmt.Errorf("value must be <= %v", *schema.Max)
		}

	case "boolean":
		if _, ok := value.(bool); !ok {
			return fmt.Errorf("expected boolean, got %T", value)
		}

	case "object":
		if _, ok := value.(map[string]interface{}); !ok {
			return fmt.Errorf("expected object, got %T", value)
		}

	case "array":
		// Accept various array types
		switch value.(type) {
		case []interface{}, []string, []int, []float64:
			// Valid array types
		default:
			return fmt.Errorf("expected array, got %T", value)
		}
	}

	return nil
}

// loadDefaultSchemas loads default configuration schemas
func (m *Manager) loadDefaultSchemas() error {
	defaults := models.GetDefaultSchemas()
	for deviceType, schema := range defaults {
		m.schemas[deviceType] = schema
		// Store in KV for persistence
		if err := m.SetConfigSchema(deviceType, schema); err != nil {
			m.log.Warnf("Failed to store default schema for %s: %v", deviceType, err)
		}
	}
	return nil
}

// Helper functions

func createOrGetKV(js jetstream.JetStream, bucket, description string) (jetstream.KeyValue, error) {
	kv, err := js.CreateKeyValue(context.Background(), jetstream.KeyValueConfig{
		Bucket:      bucket,
		Description: description,
		History:     10,
		TTL:         0, // No TTL for configs
	})
	if err != nil {
		// Try to get existing
		kv, err = js.KeyValue(context.Background(), bucket)
		if err != nil {
			return nil, err
		}
	}
	return kv, nil
}

func toFloat64(v interface{}) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case float32:
		return float64(val), true
	case int:
		return float64(val), true
	case int32:
		return float64(val), true
	case int64:
		return float64(val), true
	default:
		return 0, false
	}
}