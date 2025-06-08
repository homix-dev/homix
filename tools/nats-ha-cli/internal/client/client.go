package client

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
)

// Client wraps NATS connection for home automation operations
type Client struct {
	nc *nats.Conn
}

// New creates a new client
func New(url, user, pass string) (*Client, error) {
	opts := []nats.Option{
		nats.Name("nats-ha-cli"),
		nats.Timeout(10 * time.Second),
	}

	if user != "" && pass != "" {
		opts = append(opts, nats.UserInfo(user, pass))
	}

	nc, err := nats.Connect(url, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}

	return &Client{nc: nc}, nil
}

// Close closes the NATS connection
func (c *Client) Close() {
	c.nc.Close()
}

// ListDevices lists all devices
func (c *Client) ListDevices(deviceType string, onlineOnly bool) ([]*Device, error) {
	req := map[string]interface{}{}
	if deviceType != "" {
		req["device_type"] = deviceType
	}
	if onlineOnly {
		req["online"] = true
	}

	data, _ := json.Marshal(req)
	msg, err := c.nc.Request("home.discovery.request", data, 2*time.Second)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Devices []*Device `json:"devices"`
		Count   int       `json:"count"`
	}
	if err := json.Unmarshal(msg.Data, &resp); err != nil {
		return nil, err
	}

	return resp.Devices, nil
}

// GetDevice gets a specific device
func (c *Client) GetDevice(deviceID string) (*Device, error) {
	req := map[string]interface{}{
		"command": "get_device",
		"params": map[string]interface{}{
			"device_id": deviceID,
		},
	}

	data, _ := json.Marshal(req)
	msg, err := c.nc.Request("home.services.discovery.command", data, 2*time.Second)
	if err != nil {
		return nil, err
	}

	// Check for error response
	var errResp struct {
		Error string `json:"error"`
	}
	if err := json.Unmarshal(msg.Data, &errResp); err == nil && errResp.Error != "" {
		return nil, fmt.Errorf(errResp.Error)
	}

	var device Device
	if err := json.Unmarshal(msg.Data, &device); err != nil {
		return nil, err
	}

	return &device, nil
}

// DeleteDevice deletes a device
func (c *Client) DeleteDevice(deviceID string) error {
	req := map[string]interface{}{
		"command": "delete_device",
		"params": map[string]interface{}{
			"device_id": deviceID,
		},
	}

	data, _ := json.Marshal(req)
	msg, err := c.nc.Request("home.services.discovery.command", data, 2*time.Second)
	if err != nil {
		return err
	}

	// Check response
	var resp map[string]interface{}
	if err := json.Unmarshal(msg.Data, &resp); err != nil {
		return err
	}

	if errMsg, ok := resp["error"].(string); ok {
		return fmt.Errorf(errMsg)
	}

	return nil
}

// AnnounceDevice announces a new device
func (c *Client) AnnounceDevice(device interface{}) error {
	data, err := json.Marshal(device)
	if err != nil {
		return err
	}

	return c.nc.Publish("home.discovery.announce", data)
}

// GetDeviceConfig gets device configuration
func (c *Client) GetDeviceConfig(deviceID string) (*DeviceConfig, error) {
	msg, err := c.nc.Request(fmt.Sprintf("home.config.device.%s", deviceID), nil, 2*time.Second)
	if err != nil {
		return nil, err
	}

	var config DeviceConfig
	if err := json.Unmarshal(msg.Data, &config); err != nil {
		return nil, err
	}

	return &config, nil
}

// SetDeviceConfig sets device configuration
func (c *Client) SetDeviceConfig(config *DeviceConfig, deviceType string) error {
	req := map[string]interface{}{
		"command": "set_device_config",
		"params": map[string]interface{}{
			"config":      config,
			"device_type": deviceType,
		},
	}

	data, _ := json.Marshal(req)
	msg, err := c.nc.Request("home.services.config.command", data, 2*time.Second)
	if err != nil {
		return err
	}

	// Check response
	var resp map[string]interface{}
	if err := json.Unmarshal(msg.Data, &resp); err != nil {
		return err
	}

	if errMsg, ok := resp["error"].(string); ok {
		return fmt.Errorf(errMsg)
	}

	return nil
}

// ListDeviceConfigs lists all device configurations
func (c *Client) ListDeviceConfigs() ([]*DeviceConfig, error) {
	req := map[string]interface{}{
		"command": "list_device_configs",
		"params":  map[string]interface{}{},
	}

	data, _ := json.Marshal(req)
	msg, err := c.nc.Request("home.services.config.command", data, 2*time.Second)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Configs []*DeviceConfig `json:"configs"`
		Count   int             `json:"count"`
		Error   string          `json:"error"`
	}
	if err := json.Unmarshal(msg.Data, &resp); err != nil {
		return nil, err
	}

	if resp.Error != "" {
		return nil, fmt.Errorf(resp.Error)
	}

	return resp.Configs, nil
}

// CreateBackup creates a configuration backup
func (c *Client) CreateBackup(description string) (*ConfigBackup, error) {
	req := map[string]interface{}{
		"command": "create_backup",
		"params": map[string]interface{}{
			"description": description,
		},
	}

	data, _ := json.Marshal(req)
	msg, err := c.nc.Request("home.services.config.command", data, 5*time.Second)
	if err != nil {
		return nil, err
	}

	// Check for error response
	var errResp struct {
		Error string `json:"error"`
	}
	if err := json.Unmarshal(msg.Data, &errResp); err == nil && errResp.Error != "" {
		return nil, fmt.Errorf(errResp.Error)
	}

	var backup ConfigBackup
	if err := json.Unmarshal(msg.Data, &backup); err != nil {
		return nil, err
	}

	return &backup, nil
}

// RestoreBackup restores from a backup
func (c *Client) RestoreBackup(backupID string) error {
	req := map[string]interface{}{
		"command": "restore_backup",
		"params": map[string]interface{}{
			"backup_id": backupID,
		},
	}

	data, _ := json.Marshal(req)
	msg, err := c.nc.Request("home.services.config.command", data, 10*time.Second)
	if err != nil {
		return err
	}

	// Check response
	var resp map[string]interface{}
	if err := json.Unmarshal(msg.Data, &resp); err != nil {
		return err
	}

	if errMsg, ok := resp["error"].(string); ok {
		return fmt.Errorf(errMsg)
	}

	return nil
}

// PublishState publishes device state
func (c *Client) PublishState(deviceType, deviceID string, state interface{}) error {
	subject := fmt.Sprintf("home.devices.%s.%s.state", deviceType, deviceID)
	
	payload := map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
		"device_id": deviceID,
		"state":     state,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	return c.nc.Publish(subject, data)
}

// SendCommand sends a command to a device
func (c *Client) SendCommand(deviceType, deviceID string, command string, params interface{}) (interface{}, error) {
	subject := fmt.Sprintf("home.devices.%s.%s.command", deviceType, deviceID)
	
	payload := map[string]interface{}{
		"command":    command,
		"parameters": params,
		"request_id": fmt.Sprintf("%d", time.Now().UnixNano()),
		"timestamp":  time.Now().Format(time.RFC3339),
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	msg, err := c.nc.Request(subject, data, 5*time.Second)
	if err != nil {
		return nil, err
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(msg.Data, &resp); err != nil {
		return nil, err
	}

	if !resp["success"].(bool) {
		if errMsg, ok := resp["error"].(string); ok {
			return nil, fmt.Errorf(errMsg)
		}
		return nil, fmt.Errorf("command failed")
	}

	return resp["state"], nil
}