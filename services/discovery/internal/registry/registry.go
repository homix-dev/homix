package registry

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/calmera/nats-home-automation/services/discovery/internal/models"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/sirupsen/logrus"
)

// Registry manages the device registry using NATS KV store
type Registry struct {
	js     jetstream.JetStream
	kv     jetstream.KeyValue
	bucket string
	log    *logrus.Logger
	mu     sync.RWMutex
	cache  map[string]*models.Device
}

// New creates a new device registry
func New(js jetstream.JetStream, bucket string, log *logrus.Logger) (*Registry, error) {
	// Create or get the KV bucket
	kv, err := js.CreateKeyValue(context.Background(), jetstream.KeyValueConfig{
		Bucket:      bucket,
		Description: "Device registry for home automation",
		TTL:         24 * time.Hour,
		History:     10,
	})
	if err != nil {
		// Try to get existing bucket
		kv, err = js.KeyValue(context.Background(), bucket)
		if err != nil {
			return nil, fmt.Errorf("failed to create/get KV bucket: %w", err)
		}
	}

	r := &Registry{
		js:     js,
		kv:     kv,
		bucket: bucket,
		log:    log,
		cache:  make(map[string]*models.Device),
	}

	// Load existing devices into cache
	if err := r.loadCache(); err != nil {
		log.Warnf("Failed to load cache: %v", err)
	}

	return r, nil
}

// Register adds or updates a device in the registry
func (r *Registry) Register(device *models.Device) error {
	if err := device.Validate(); err != nil {
		return fmt.Errorf("invalid device: %w", err)
	}

	// Update registration timestamp
	if device.Status.RegisteredAt.IsZero() {
		device.Status.RegisteredAt = time.Now()
	}
	device.UpdateStatus(true)

	// Serialize device
	data, err := json.Marshal(device)
	if err != nil {
		return fmt.Errorf("failed to marshal device: %w", err)
	}

	// Store in KV
	key := fmt.Sprintf("device.%s", device.DeviceID)
	if _, err := r.kv.Put(context.Background(), key, data); err != nil {
		return fmt.Errorf("failed to store device: %w", err)
	}

	// Update cache
	r.mu.Lock()
	r.cache[device.DeviceID] = device
	r.mu.Unlock()

	r.log.Infof("Registered device: %s (%s)", device.DeviceID, device.Name)
	return nil
}

// Get retrieves a device by ID
func (r *Registry) Get(deviceID string) (*models.Device, error) {
	// Check cache first
	r.mu.RLock()
	if device, ok := r.cache[deviceID]; ok {
		r.mu.RUnlock()
		return device, nil
	}
	r.mu.RUnlock()

	// Fetch from KV store
	key := fmt.Sprintf("device.%s", deviceID)
	entry, err := r.kv.Get(context.Background(), key)
	if err != nil {
		if err == jetstream.ErrKeyNotFound {
			return nil, fmt.Errorf("device not found: %s", deviceID)
		}
		return nil, fmt.Errorf("failed to get device: %w", err)
	}

	// Deserialize
	var device models.Device
	if err := json.Unmarshal(entry.Value(), &device); err != nil {
		return nil, fmt.Errorf("failed to unmarshal device: %w", err)
	}

	// Update cache
	r.mu.Lock()
	r.cache[deviceID] = &device
	r.mu.Unlock()

	return &device, nil
}

// List returns all registered devices
func (r *Registry) List() ([]*models.Device, error) {
	keys, err := r.kv.Keys(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to list keys: %w", err)
	}

	devices := make([]*models.Device, 0, len(keys))
	for _, key := range keys {
		entry, err := r.kv.Get(context.Background(), key)
		if err != nil {
			r.log.Warnf("Failed to get device %s: %v", key, err)
			continue
		}

		var device models.Device
		if err := json.Unmarshal(entry.Value(), &device); err != nil {
			r.log.Warnf("Failed to unmarshal device %s: %v", key, err)
			continue
		}

		devices = append(devices, &device)
	}

	return devices, nil
}

// ListByType returns devices of a specific type
func (r *Registry) ListByType(deviceType string) ([]*models.Device, error) {
	devices, err := r.List()
	if err != nil {
		return nil, err
	}

	filtered := make([]*models.Device, 0)
	for _, device := range devices {
		if device.DeviceType == deviceType {
			filtered = append(filtered, device)
		}
	}

	return filtered, nil
}

// Delete removes a device from the registry
func (r *Registry) Delete(deviceID string) error {
	key := fmt.Sprintf("device.%s", deviceID)
	if err := r.kv.Delete(context.Background(), key); err != nil {
		if err != jetstream.ErrKeyNotFound {
			return fmt.Errorf("failed to delete device: %w", err)
		}
	}

	// Remove from cache
	r.mu.Lock()
	delete(r.cache, deviceID)
	r.mu.Unlock()

	r.log.Infof("Deleted device: %s", deviceID)
	return nil
}

// UpdateStatus updates the online status of a device
func (r *Registry) UpdateStatus(deviceID string, online bool) error {
	device, err := r.Get(deviceID)
	if err != nil {
		return err
	}

	device.UpdateStatus(online)
	return r.Register(device)
}

// Watch watches for changes to the device registry
func (r *Registry) Watch(ctx context.Context, callback func(device *models.Device, operation string)) error {
	watcher, err := r.kv.WatchAll(ctx)
	if err != nil {
		return fmt.Errorf("failed to create watcher: %w", err)
	}

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case kve := <-watcher.Updates():
				if kve == nil {
					continue
				}

				operation := "update"
				if kve.Operation() == jetstream.KeyValueDelete {
					operation = "delete"
				} else if kve.Created() == kve.Revision() {
					operation = "create"
				}

				if kve.Operation() != jetstream.KeyValueDelete {
					var device models.Device
					if err := json.Unmarshal(kve.Value(), &device); err != nil {
						r.log.Warnf("Failed to unmarshal device update: %v", err)
						continue
					}
					callback(&device, operation)
				} else {
					// For delete operations, we only have the key
					callback(&models.Device{DeviceID: kve.Key()}, operation)
				}
			}
		}
	}()

	return nil
}

// loadCache loads all devices into memory cache
func (r *Registry) loadCache() error {
	devices, err := r.List()
	if err != nil {
		return err
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	for _, device := range devices {
		r.cache[device.DeviceID] = device
	}

	r.log.Infof("Loaded %d devices into cache", len(r.cache))
	return nil
}

// GetStats returns registry statistics
func (r *Registry) GetStats() map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()

	typeCount := make(map[string]int)
	onlineCount := 0

	for _, device := range r.cache {
		typeCount[device.DeviceType]++
		if device.Status.Online {
			onlineCount++
		}
	}

	return map[string]interface{}{
		"total_devices": len(r.cache),
		"online_devices": onlineCount,
		"devices_by_type": typeCount,
	}
}