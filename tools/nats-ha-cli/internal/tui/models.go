package tui

import (
	"fmt"

	"github.com/homix-dev/homix/tools/nats-ha-cli/internal/client"
)

// Device item for list
type deviceItem struct {
	device *client.Device
}

func (i deviceItem) Title() string {
	status := "○"
	if i.device.Status.Online {
		status = "●"
	}
	return fmt.Sprintf("%s %s", status, i.device.Name)
}

func (i deviceItem) Description() string {
	return fmt.Sprintf("%s - %s", i.device.DeviceID, i.device.DeviceType)
}

func (i deviceItem) FilterValue() string {
	return i.device.Name + " " + i.device.DeviceID
}

// Config item for list
type configItem struct {
	config *client.DeviceConfig
}

func (i configItem) Title() string {
	enabled := "☐"
	if i.config.Enabled {
		enabled = "☑"
	}
	return fmt.Sprintf("%s %s", enabled, i.config.Name)
}

func (i configItem) Description() string {
	loc := i.config.Location
	if loc == "" {
		loc = "No location"
	}
	return fmt.Sprintf("%s - %s", i.config.DeviceID, loc)
}

func (i configItem) FilterValue() string {
	return i.config.Name + " " + i.config.DeviceID
}