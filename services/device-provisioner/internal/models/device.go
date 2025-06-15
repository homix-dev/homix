package models

import "time"

// DeviceType represents the type of device
type DeviceType string

const (
	DeviceTypeLight       DeviceType = "light"
	DeviceTypeSensor      DeviceType = "sensor"
	DeviceTypeSwitch      DeviceType = "switch"
	DeviceTypeThermostat  DeviceType = "thermostat"
	DeviceTypeLock        DeviceType = "lock"
	DeviceTypeCover       DeviceType = "cover"
	DeviceTypeCamera      DeviceType = "camera"
	DeviceTypeFan         DeviceType = "fan"
)

// ProvisionRequest represents a request to provision a new device
type ProvisionRequest struct {
	DeviceID    string                 `json:"device_id"`
	DeviceType  DeviceType             `json:"device_type"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// ProvisionResponse contains the provisioned device credentials
type ProvisionResponse struct {
	DeviceID    string    `json:"device_id"`
	JWT         string    `json:"jwt"`
	Seed        string    `json:"seed"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`
	Subjects    Subjects  `json:"subjects"`
}

// Subjects contains the NATS subjects this device can use
type Subjects struct {
	Publish   []string `json:"publish"`
	Subscribe []string `json:"subscribe"`
}

// DeviceCredentials represents stored device credentials
type DeviceCredentials struct {
	DeviceID    string     `json:"device_id"`
	DeviceType  DeviceType `json:"device_type"`
	Name        string     `json:"name"`
	PublicKey   string     `json:"public_key"`
	CreatedAt   time.Time  `json:"created_at"`
	ExpiresAt   time.Time  `json:"expires_at"`
	RevokedAt   *time.Time `json:"revoked_at,omitempty"`
}