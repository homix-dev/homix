package tui

import (
	"fmt"

	"github.com/calmera/nats-home-automation/tools/nats-ha-cli/internal/client"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
)

// Messages
type devicesLoadedMsg struct {
	devices []*client.Device
}

type configsLoadedMsg struct {
	configs []*client.DeviceConfig
}

type deviceDetailMsg struct {
	device *client.Device
}

type configDetailMsg struct {
	config *client.DeviceConfig
}

type errorMsg struct {
	err error
}

type successMsg struct {
	message string
}

// Commands
func (m Model) loadDevices() tea.Msg {
	devices, err := m.client.ListDevices("", false)
	if err != nil {
		return errorMsg{err: err}
	}
	return devicesLoadedMsg{devices: devices}
}

func (m Model) loadConfigs() tea.Msg {
	configs, err := m.client.ListDeviceConfigs()
	if err != nil {
		return errorMsg{err: err}
	}
	return configsLoadedMsg{configs: configs}
}

func (m Model) loadDeviceDetail(deviceID string) tea.Cmd {
	return func() tea.Msg {
		device, err := m.client.GetDevice(deviceID)
		if err != nil {
			return errorMsg{err: err}
		}
		return deviceDetailMsg{device: device}
	}
}

func (m Model) loadConfigDetail(deviceID string) tea.Cmd {
	return func() tea.Msg {
		config, err := m.client.GetDeviceConfig(deviceID)
		if err != nil {
			return errorMsg{err: err}
		}
		return configDetailMsg{config: config}
	}
}

func (m Model) saveConfig() tea.Cmd {
	return func() tea.Msg {
		if m.selectedConfig == nil {
			return errorMsg{err: fmt.Errorf("no config selected")}
		}

		// Update config from inputs
		m.selectedConfig.Name = m.configInputs[0].Value()
		m.selectedConfig.Location = m.configInputs[1].Value()
		m.selectedConfig.Enabled = m.configInputs[2].Value() == "true"

		if err := m.client.SetDeviceConfig(m.selectedConfig, ""); err != nil {
			return errorMsg{err: err}
		}

		return successMsg{message: "Configuration saved successfully"}
	}
}

// Helper methods
func (m Model) handleEnter() tea.Cmd {
	switch m.currentView {
	case menuView:
		selected := m.menuList.SelectedItem()
		if item, ok := selected.(menuItem); ok {
			m.previousView = m.currentView
			m.currentView = item.action
			
			switch item.action {
			case deviceListView:
				return m.loadDevices
			case configView:
				return m.loadConfigs
			}
		}

	case deviceListView:
		selected := m.deviceList.SelectedItem()
		if item, ok := selected.(deviceItem); ok {
			return m.loadDeviceDetail(item.device.DeviceID)
		}

	case configView:
		selected := m.configList.SelectedItem()
		if item, ok := selected.(configItem); ok {
			return m.loadConfigDetail(item.config.DeviceID)
		}

	case configEditView:
		return m.saveConfig()
	}

	return nil
}

func (m *Model) setupConfigInputs() {
	if m.selectedConfig == nil {
		return
	}

	// Create text inputs
	nameInput := textinput.New()
	nameInput.SetValue(m.selectedConfig.Name)
	nameInput.CharLimit = 50
	nameInput.Width = 30
	nameInput.Focus()

	locationInput := textinput.New()
	locationInput.SetValue(m.selectedConfig.Location)
	locationInput.CharLimit = 50
	locationInput.Width = 30

	enabledInput := textinput.New()
	if m.selectedConfig.Enabled {
		enabledInput.SetValue("true")
	} else {
		enabledInput.SetValue("false")
	}
	enabledInput.CharLimit = 5
	enabledInput.Width = 10

	m.configInputs = []textinput.Model{
		nameInput,
		locationInput,
		enabledInput,
	}
	m.focusIndex = 0
}