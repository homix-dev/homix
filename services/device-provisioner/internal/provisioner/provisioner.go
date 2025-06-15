package provisioner

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/homix-dev/homix/services/device-provisioner/internal/models"
	"github.com/nats-io/jwt/v2"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/nats-io/nkeys"
	"github.com/sirupsen/logrus"
)

// Provisioner handles device credential provisioning
type Provisioner struct {
	nc         *nats.Conn
	js         jetstream.JetStream
	kv         jetstream.KeyValue
	log        *logrus.Logger
	signingKey nkeys.KeyPair
	accountPub string
	issuerName string
}

// Config contains provisioner configuration
type Config struct {
	NATS        *nats.Conn
	Logger      *logrus.Logger
	SigningKey  string // Base64 encoded signing key
	AccountPub  string // Account public key
	IssuerName  string // Name for the issuer
	KVBucket    string // KV bucket for storing device registry
}

// New creates a new device provisioner
func New(cfg Config) (*Provisioner, error) {
	// Decode signing key
	signingKey, err := nkeys.FromSeed([]byte(cfg.SigningKey))
	if err != nil {
		return nil, fmt.Errorf("invalid signing key: %w", err)
	}

	// Get JetStream context
	js, err := jetstream.New(cfg.NATS)
	if err != nil {
		return nil, fmt.Errorf("failed to create JetStream context: %w", err)
	}

	// Get or create KV bucket for device registry
	kv, err := js.KeyValue(context.Background(), cfg.KVBucket)
	if err != nil {
		// Try to create the bucket
		kvConfig := jetstream.KeyValueConfig{
			Bucket:      cfg.KVBucket,
			Description: "Device credential registry",
			TTL:         0, // No TTL - permanent storage
			History:     10,
		}
		kv, err = js.CreateKeyValue(context.Background(), kvConfig)
		if err != nil {
			return nil, fmt.Errorf("failed to create KV bucket: %w", err)
		}
	}

	return &Provisioner{
		nc:         cfg.NATS,
		js:         js,
		kv:         kv,
		log:        cfg.Logger,
		signingKey: signingKey,
		accountPub: cfg.AccountPub,
		issuerName: cfg.IssuerName,
	}, nil
}

// ProvisionDevice creates new credentials for a device
func (p *Provisioner) ProvisionDevice(ctx context.Context, req models.ProvisionRequest) (*models.ProvisionResponse, error) {
	// Validate request
	if req.DeviceID == "" {
		return nil, fmt.Errorf("device_id is required")
	}
	if req.DeviceType == "" {
		return nil, fmt.Errorf("device_type is required")
	}

	// Check if device already exists
	existing, err := p.getDevice(ctx, req.DeviceID)
	if err == nil && existing != nil && existing.RevokedAt == nil {
		return nil, fmt.Errorf("device %s already provisioned", req.DeviceID)
	}

	// Generate new nkey pair for the device
	deviceKey, err := nkeys.CreateUser()
	if err != nil {
		return nil, fmt.Errorf("failed to create device key: %w", err)
	}

	devicePub, err := deviceKey.PublicKey()
	if err != nil {
		return nil, fmt.Errorf("failed to get device public key: %w", err)
	}

	deviceSeed, err := deviceKey.Seed()
	if err != nil {
		return nil, fmt.Errorf("failed to get device seed: %w", err)
	}

	// Create JWT claims
	now := time.Now()
	expiry := now.Add(365 * 24 * time.Hour) // 1 year expiry

	// Define allowed subjects based on device type
	pubSubjects := p.getPublishSubjects(req.DeviceID, req.DeviceType)
	subSubjects := p.getSubscribeSubjects(req.DeviceID, req.DeviceType)

	claims := jwt.NewUserClaims(devicePub)
	claims.Name = req.DeviceID
	claims.Subject = devicePub
	claims.Issuer = p.issuerName
	claims.IssuedAt = now.Unix()
	claims.Expires = expiry.Unix()
	claims.Pub.Allow = pubSubjects
	claims.Sub.Allow = subSubjects
	claims.Resp = &jwt.ResponsePermission{
		MaxMsgs: 1,
		Expires: time.Minute,
	}
	
	// Add metadata as tags
	if req.Metadata != nil {
		claims.Tags = make(jwt.TagList, 0)
		claims.Tags.Add(fmt.Sprintf("device_type:%s", req.DeviceType))
		claims.Tags.Add(fmt.Sprintf("name:%s", req.Name))
	}

	// Sign the JWT
	token, err := claims.Encode(p.signingKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encode JWT: %w", err)
	}

	// Store device info in KV
	deviceCreds := models.DeviceCredentials{
		DeviceID:   req.DeviceID,
		DeviceType: req.DeviceType,
		Name:       req.Name,
		PublicKey:  devicePub,
		CreatedAt:  now,
		ExpiresAt:  expiry,
	}

	data, err := json.Marshal(deviceCreds)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal device credentials: %w", err)
	}

	_, err = p.kv.Put(ctx, req.DeviceID, data)
	if err != nil {
		return nil, fmt.Errorf("failed to store device credentials: %w", err)
	}

	// Log provisioning event
	p.log.WithFields(logrus.Fields{
		"device_id":   req.DeviceID,
		"device_type": req.DeviceType,
		"name":        req.Name,
	}).Info("Device provisioned")

	return &models.ProvisionResponse{
		DeviceID:  req.DeviceID,
		JWT:       token,
		Seed:      string(deviceSeed),
		CreatedAt: now,
		ExpiresAt: expiry,
		Subjects: models.Subjects{
			Publish:   pubSubjects,
			Subscribe: subSubjects,
		},
	}, nil
}

// RevokeDevice revokes a device's credentials
func (p *Provisioner) RevokeDevice(ctx context.Context, deviceID string) error {
	// Get existing device
	device, err := p.getDevice(ctx, deviceID)
	if err != nil {
		return fmt.Errorf("device not found: %w", err)
	}

	// Mark as revoked
	now := time.Now()
	device.RevokedAt = &now

	// Update in KV
	data, err := json.Marshal(device)
	if err != nil {
		return fmt.Errorf("failed to marshal device credentials: %w", err)
	}

	_, err = p.kv.Put(ctx, deviceID, data)
	if err != nil {
		return fmt.Errorf("failed to update device credentials: %w", err)
	}

	// TODO: Publish revocation to NATS for immediate effect

	p.log.WithField("device_id", deviceID).Info("Device revoked")
	return nil
}

// ListDevices returns all provisioned devices
func (p *Provisioner) ListDevices(ctx context.Context) ([]models.DeviceCredentials, error) {
	devices := make([]models.DeviceCredentials, 0)

	entries, err := p.kv.Keys(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list devices: %w", err)
	}

	for _, key := range entries {
		entry, err := p.kv.Get(ctx, key)
		if err != nil {
			continue
		}

		var device models.DeviceCredentials
		if err := json.Unmarshal(entry.Value(), &device); err != nil {
			continue
		}

		devices = append(devices, device)
	}

	return devices, nil
}

// getDevice retrieves a device from KV
func (p *Provisioner) getDevice(ctx context.Context, deviceID string) (*models.DeviceCredentials, error) {
	entry, err := p.kv.Get(ctx, deviceID)
	if err != nil {
		return nil, err
	}

	var device models.DeviceCredentials
	if err := json.Unmarshal(entry.Value(), &device); err != nil {
		return nil, err
	}

	return &device, nil
}

// getPublishSubjects returns allowed publish subjects for a device
func (p *Provisioner) getPublishSubjects(deviceID string, deviceType models.DeviceType) []string {
	base := fmt.Sprintf("home.devices.%s.%s", deviceType, deviceID)
	
	subjects := []string{
		fmt.Sprintf("%s.state", base),
		fmt.Sprintf("%s.announce", base),
		fmt.Sprintf("%s.health", base),
		"home.discovery.announce",
		"_INBOX.>",
		"$JS.API.CONSUMER.MSG.NEXT.>",
	}

	// Add type-specific subjects
	switch deviceType {
	case models.DeviceTypeSensor:
		subjects = append(subjects, fmt.Sprintf("%s.reading", base))
	case models.DeviceTypeCamera:
		subjects = append(subjects, fmt.Sprintf("%s.motion", base))
		subjects = append(subjects, fmt.Sprintf("%s.snapshot", base))
	}

	return subjects
}

// getSubscribeSubjects returns allowed subscribe subjects for a device
func (p *Provisioner) getSubscribeSubjects(deviceID string, deviceType models.DeviceType) []string {
	base := fmt.Sprintf("home.devices.%s.%s", deviceType, deviceID)
	
	subjects := []string{
		fmt.Sprintf("%s.command", base),
		fmt.Sprintf("%s.config", base),
		"home.discovery.request",
		"_INBOX.>",
	}

	// Add type-specific subjects
	switch deviceType {
	case models.DeviceTypeThermostat:
		subjects = append(subjects, fmt.Sprintf("%s.schedule", base))
	case models.DeviceTypeCamera:
		subjects = append(subjects, fmt.Sprintf("%s.stream", base))
	}

	return subjects
}

// Run starts the provisioner service
func (p *Provisioner) Run(ctx context.Context) error {
	// Subscribe to provisioning requests
	sub, err := p.nc.QueueSubscribe("home.provisioning.request", "provisioner", func(msg *nats.Msg) {
		var req models.ProvisionRequest
		if err := json.Unmarshal(msg.Data, &req); err != nil {
			p.log.WithError(err).Error("Failed to unmarshal provision request")
			msg.Respond([]byte(fmt.Sprintf(`{"error": "%s"}`, err.Error())))
			return
		}

		resp, err := p.ProvisionDevice(ctx, req)
		if err != nil {
			p.log.WithError(err).Error("Failed to provision device")
			msg.Respond([]byte(fmt.Sprintf(`{"error": "%s"}`, err.Error())))
			return
		}

		data, err := json.Marshal(resp)
		if err != nil {
			p.log.WithError(err).Error("Failed to marshal provision response")
			msg.Respond([]byte(fmt.Sprintf(`{"error": "%s"}`, err.Error())))
			return
		}

		msg.Respond(data)
	})
	if err != nil {
		return fmt.Errorf("failed to subscribe to provisioning requests: %w", err)
	}
	defer sub.Unsubscribe()

	// Subscribe to revocation requests
	revokeSub, err := p.nc.QueueSubscribe("home.provisioning.revoke", "provisioner", func(msg *nats.Msg) {
		deviceID := strings.TrimSpace(string(msg.Data))
		if deviceID == "" {
			msg.Respond([]byte(`{"error": "device_id is required"}`))
			return
		}

		if err := p.RevokeDevice(ctx, deviceID); err != nil {
			p.log.WithError(err).Error("Failed to revoke device")
			msg.Respond([]byte(fmt.Sprintf(`{"error": "%s"}`, err.Error())))
			return
		}

		msg.Respond([]byte(`{"success": true}`))
	})
	if err != nil {
		return fmt.Errorf("failed to subscribe to revocation requests: %w", err)
	}
	defer revokeSub.Unsubscribe()

	p.log.Info("Device provisioner started")

	// Wait for context cancellation
	<-ctx.Done()
	return ctx.Err()
}