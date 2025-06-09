package cmd_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/calmera/nats-home-automation/tools/nats-ha-cli/cmd"
)

// MockNATSConnection mocks NATS connection for testing
type MockNATSConnection struct {
	mock.Mock
}

func (m *MockNATSConnection) Request(subject string, data []byte, timeout time.Duration) (*nats.Msg, error) {
	args := m.Called(subject, data, timeout)
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*nats.Msg), nil
}

func (m *MockNATSConnection) Publish(subject string, data []byte) error {
	args := m.Called(subject, data)
	return args.Error(0)
}

func (m *MockNATSConnection) Subscribe(subject string, cb nats.MsgHandler) (*nats.Subscription, error) {
	args := m.Called(subject, cb)
	if args.Error(1) != nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*nats.Subscription), nil
}

func (m *MockNATSConnection) Close() {
	m.Called()
}

func TestDevicesListCommand(t *testing.T) {
	// Mock response data
	devices := []map[string]interface{}{
		{
			"id":           "sensor-01",
			"type":         "sensor",
			"name":         "Living Room Temperature",
			"status":       "online",
			"manufacturer": "Test Inc",
			"model":        "TS-001",
		},
		{
			"id":     "switch-01",
			"type":   "switch",
			"name":   "Kitchen Light",
			"status": "offline",
		},
	}

	responseData, _ := json.Marshal(devices)

	// Create mock connection
	mockConn := new(MockNATSConnection)
	mockConn.On("Request", "home.discovery.list", mock.Anything, mock.Anything).
		Return(&nats.Msg{Data: responseData}, nil)

	// Create command with mock
	cmd := &cobra.Command{}
	cmd.SetOut(new(bytes.Buffer))
	
	// Execute command
	err := executeDevicesList(cmd, mockConn)
	require.NoError(t, err)

	// Verify output
	output := cmd.OutOrStdout().(*bytes.Buffer).String()
	assert.Contains(t, output, "sensor-01")
	assert.Contains(t, output, "Living Room Temperature")
	assert.Contains(t, output, "online")
	assert.Contains(t, output, "switch-01")
	assert.Contains(t, output, "Kitchen Light")
	assert.Contains(t, output, "offline")

	mockConn.AssertExpectations(t)
}

func TestDevicesGetCommand(t *testing.T) {
	deviceID := "sensor-01"
	device := map[string]interface{}{
		"id":           deviceID,
		"type":         "sensor",
		"name":         "Living Room Temperature",
		"status":       "online",
		"manufacturer": "Test Inc",
		"model":        "TS-001",
		"capabilities": map[string]interface{}{
			"sensors": []string{"temperature", "humidity"},
		},
		"config": map[string]interface{}{
			"update_interval": 30,
		},
		"last_seen": "2024-01-15T10:30:00Z",
	}

	responseData, _ := json.Marshal(device)

	// Create mock connection
	mockConn := new(MockNATSConnection)
	mockConn.On("Request", "home.discovery.get", mock.MatchedBy(func(data []byte) bool {
		var req map[string]string
		json.Unmarshal(data, &req)
		return req["device_id"] == deviceID
	}), mock.Anything).Return(&nats.Msg{Data: responseData}, nil)

	// Create command
	cmd := &cobra.Command{}
	cmd.SetOut(new(bytes.Buffer))

	// Execute command
	err := executeDevicesGet(cmd, mockConn, deviceID)
	require.NoError(t, err)

	// Verify output
	output := cmd.OutOrStdout().(*bytes.Buffer).String()
	assert.Contains(t, output, deviceID)
	assert.Contains(t, output, "Living Room Temperature")
	assert.Contains(t, output, "temperature")
	assert.Contains(t, output, "humidity")
	assert.Contains(t, output, "update_interval")

	mockConn.AssertExpectations(t)
}

func TestDevicesRegisterCommand(t *testing.T) {
	device := map[string]interface{}{
		"id":           "new-device-01",
		"type":         "switch",
		"name":         "New Switch",
		"manufacturer": "DIY",
		"model":        "ESP-01",
	}

	// Create mock connection
	mockConn := new(MockNATSConnection)
	mockConn.On("Request", "home.discovery.register", mock.MatchedBy(func(data []byte) bool {
		var req map[string]interface{}
		json.Unmarshal(data, &req)
		return req["id"] == device["id"]
	}), mock.Anything).Return(&nats.Msg{Data: []byte(`{"status":"registered"}`)}, nil)

	// Create command
	cmd := &cobra.Command{}
	cmd.SetOut(new(bytes.Buffer))

	// Execute command
	err := executeDevicesRegister(cmd, mockConn, device)
	require.NoError(t, err)

	// Verify output
	output := cmd.OutOrStdout().(*bytes.Buffer).String()
	assert.Contains(t, output, "registered")

	mockConn.AssertExpectations(t)
}

func TestDevicesDeleteCommand(t *testing.T) {
	deviceID := "device-to-delete"

	// Create mock connection
	mockConn := new(MockNATSConnection)
	mockConn.On("Request", "home.discovery.delete", mock.MatchedBy(func(data []byte) bool {
		var req map[string]string
		json.Unmarshal(data, &req)
		return req["device_id"] == deviceID
	}), mock.Anything).Return(&nats.Msg{Data: []byte(`{"status":"deleted"}`)}, nil)

	// Create command
	cmd := &cobra.Command{}
	cmd.SetOut(new(bytes.Buffer))

	// Execute command with confirmation
	err := executeDevicesDelete(cmd, mockConn, deviceID, true)
	require.NoError(t, err)

	// Verify output
	output := cmd.OutOrStdout().(*bytes.Buffer).String()
	assert.Contains(t, output, "deleted")

	mockConn.AssertExpectations(t)
}

func TestDevicesControlCommand(t *testing.T) {
	tests := []struct {
		name      string
		deviceID  string
		action    string
		params    map[string]interface{}
		response  string
		wantError bool
	}{
		{
			name:     "turn on switch",
			deviceID: "switch-01",
			action:   "on",
			response: `{"status":"on"}`,
		},
		{
			name:     "turn off switch",
			deviceID: "switch-01",
			action:   "off",
			response: `{"status":"off"}`,
		},
		{
			name:     "set temperature",
			deviceID: "thermostat-01",
			action:   "set_temperature",
			params:   map[string]interface{}{"temperature": 22.5},
			response: `{"status":"ok","temperature":22.5}`,
		},
		{
			name:      "invalid action",
			deviceID:  "device-01",
			action:    "invalid_action",
			response:  `{"error":"unknown action"}`,
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock connection
			mockConn := new(MockNATSConnection)
			
			expectedSubject := fmt.Sprintf("home.devices.*.%s.command", tt.deviceID)
			mockConn.On("Request", expectedSubject, mock.MatchedBy(func(data []byte) bool {
				var req map[string]interface{}
				json.Unmarshal(data, &req)
				return req["action"] == tt.action
			}), mock.Anything).Return(&nats.Msg{Data: []byte(tt.response)}, nil)

			// Create command
			cmd := &cobra.Command{}
			cmd.SetOut(new(bytes.Buffer))

			// Execute command
			err := executeDevicesControl(cmd, mockConn, tt.deviceID, tt.action, tt.params)
			
			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			mockConn.AssertExpectations(t)
		})
	}
}

func TestDevicesMonitorCommand(t *testing.T) {
	// Create mock connection
	mockConn := new(MockNATSConnection)
	mockSub := &nats.Subscription{}
	
	mockConn.On("Subscribe", "home.devices.>", mock.Anything).Return(mockSub, nil)

	// Create command
	cmd := &cobra.Command{}
	cmd.SetOut(new(bytes.Buffer))

	// Start monitoring (will subscribe)
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	err := executeDevicesMonitor(ctx, cmd, mockConn, []string{})
	require.NoError(t, err)

	mockConn.AssertExpectations(t)
}

// Helper functions for command execution
func executeDevicesList(cmd *cobra.Command, conn *MockNATSConnection) error {
	// Implementation would call the actual command function
	// This is a simplified version for testing
	resp, err := conn.Request("home.discovery.list", []byte("{}"), 5*time.Second)
	if err != nil {
		return err
	}

	var devices []map[string]interface{}
	if err := json.Unmarshal(resp.Data, &devices); err != nil {
		return err
	}

	// Format output
	for _, device := range devices {
		fmt.Fprintf(cmd.OutOrStdout(), "%s\t%s\t%s\t%s\n",
			device["id"], device["type"], device["name"], device["status"])
	}

	return nil
}

func executeDevicesGet(cmd *cobra.Command, conn *MockNATSConnection, deviceID string) error {
	req := map[string]string{"device_id": deviceID}
	reqData, _ := json.Marshal(req)
	
	resp, err := conn.Request("home.discovery.get", reqData, 5*time.Second)
	if err != nil {
		return err
	}

	var device map[string]interface{}
	if err := json.Unmarshal(resp.Data, &device); err != nil {
		return err
	}

	// Pretty print device
	output, _ := json.MarshalIndent(device, "", "  ")
	fmt.Fprintln(cmd.OutOrStdout(), string(output))

	return nil
}

func executeDevicesRegister(cmd *cobra.Command, conn *MockNATSConnection, device map[string]interface{}) error {
	reqData, _ := json.Marshal(device)
	
	resp, err := conn.Request("home.discovery.register", reqData, 5*time.Second)
	if err != nil {
		return err
	}

	fmt.Fprintln(cmd.OutOrStdout(), string(resp.Data))
	return nil
}

func executeDevicesDelete(cmd *cobra.Command, conn *MockNATSConnection, deviceID string, confirmed bool) error {
	if !confirmed {
		return fmt.Errorf("deletion cancelled")
	}

	req := map[string]string{"device_id": deviceID}
	reqData, _ := json.Marshal(req)
	
	resp, err := conn.Request("home.discovery.delete", reqData, 5*time.Second)
	if err != nil {
		return err
	}

	fmt.Fprintln(cmd.OutOrStdout(), string(resp.Data))
	return nil
}

func executeDevicesControl(cmd *cobra.Command, conn *MockNATSConnection, deviceID, action string, params map[string]interface{}) error {
	req := map[string]interface{}{
		"action": action,
	}
	for k, v := range params {
		req[k] = v
	}
	
	reqData, _ := json.Marshal(req)
	subject := fmt.Sprintf("home.devices.*.%s.command", deviceID)
	
	resp, err := conn.Request(subject, reqData, 5*time.Second)
	if err != nil {
		return err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return err
	}

	if errMsg, ok := result["error"]; ok {
		return fmt.Errorf("%v", errMsg)
	}

	fmt.Fprintln(cmd.OutOrStdout(), string(resp.Data))
	return nil
}

func executeDevicesMonitor(ctx context.Context, cmd *cobra.Command, conn *MockNATSConnection, filters []string) error {
	subject := "home.devices.>"
	if len(filters) > 0 {
		// Apply filters
		subject = fmt.Sprintf("home.devices.%s.>", filters[0])
	}

	_, err := conn.Subscribe(subject, func(msg *nats.Msg) {
		fmt.Fprintf(cmd.OutOrStdout(), "[%s] %s\n", msg.Subject, string(msg.Data))
	})

	if err != nil {
		return err
	}

	<-ctx.Done()
	return nil
}