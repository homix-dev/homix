package tui

import (
	"fmt"
	"strings"

	"github.com/homix-dev/homix/tools/nats-ha-cli/internal/client"
	tea "github.com/charmbracelet/bubbletea"
)

// SimpleModel is a simplified TUI model
type SimpleModel struct {
	client       *client.Client
	choices      []string
	cursor       int
	selected     map[int]struct{}
	devices      []*client.Device
	currentView  string
	selectedItem string
	err          error
}

// SimpleInit initializes the model
func (m SimpleModel) Init() tea.Cmd {
	return nil
}

// SimpleUpdate handles input
func (m SimpleModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			return m, tea.Quit

		case "up", "k":
			if m.cursor > 0 {
				m.cursor--
			}

		case "down", "j":
			if m.cursor < len(m.choices)-1 {
				m.cursor++
			}

		case "enter", " ":
			// Handle selection based on current view
			switch m.currentView {
			case "menu":
				switch m.cursor {
				case 0: // Devices
					m.currentView = "devices"
					return m, m.loadDevicesCmd
				case 1: // Configurations
					m.currentView = "configs"
					return m, nil
				case 2: // Exit
					return m, tea.Quit
				}
			case "devices":
				if m.cursor == len(m.devices) {
					// Back option
					m.currentView = "menu"
					m.cursor = 0
				} else if m.cursor < len(m.devices) {
					// Show device details
					m.selectedItem = m.devices[m.cursor].DeviceID
					m.currentView = "device-detail"
				}
			case "device-detail", "configs":
				// Go back
				if m.currentView == "device-detail" {
					m.currentView = "devices"
				} else {
					m.currentView = "menu"
				}
				m.cursor = 0
			}

		case "esc":
			// Go back
			switch m.currentView {
			case "devices", "configs":
				m.currentView = "menu"
				m.cursor = 0
			case "device-detail":
				m.currentView = "devices"
				m.cursor = 0
			}
		}

	case devicesLoadedMsg:
		m.devices = msg.devices
		m.updateChoices()

	case errorMsg:
		m.err = msg.err
	}

	return m, nil
}

// SimpleView renders the UI
func (m SimpleModel) View() string {
	var s strings.Builder

	// Title
	title := titleStyle.Render(" NATS Home Automation ")
	s.WriteString(title + "\n\n")

	// Content based on view
	switch m.currentView {
	case "menu":
		s.WriteString("Main Menu:\n\n")
		m.choices = []string{"Devices", "Configurations", "Exit"}

	case "devices":
		s.WriteString("Devices:\n\n")
		m.choices = []string{}
		for _, d := range m.devices {
			status := "🔴"
			if d.Status.Online {
				status = "🟢"
			}
			m.choices = append(m.choices, fmt.Sprintf("%s %s (%s)", status, d.Name, d.DeviceID))
		}
		m.choices = append(m.choices, "← Back")

	case "device-detail":
		s.WriteString("Device Details:\n\n")
		for _, d := range m.devices {
			if d.DeviceID == m.selectedItem {
				s.WriteString(fmt.Sprintf("  ID: %s\n", d.DeviceID))
				s.WriteString(fmt.Sprintf("  Name: %s\n", d.Name))
				s.WriteString(fmt.Sprintf("  Type: %s\n", d.DeviceType))
				s.WriteString(fmt.Sprintf("  Online: %v\n", d.Status.Online))
				s.WriteString(fmt.Sprintf("  Last Seen: %s\n", d.Status.LastSeen.Format("15:04:05")))
				break
			}
		}
		s.WriteString("\nPress Enter or Esc to go back\n")
		return s.String()

	case "configs":
		s.WriteString("Configuration Management:\n\n")
		s.WriteString("(Not implemented in simple mode)\n\n")
		s.WriteString("Press Enter or Esc to go back\n")
		return s.String()
	}

	// Render choices
	for i, choice := range m.choices {
		cursor := " "
		if m.cursor == i {
			cursor = ">"
			choice = selectedStyle.Render(choice)
		}
		s.WriteString(fmt.Sprintf("%s %s\n", cursor, choice))
	}

	// Help
	s.WriteString("\n")
	s.WriteString(helpStyle.Render("↑/↓: Navigate • Enter: Select • q: Quit • Esc: Back"))

	// Error
	if m.err != nil {
		s.WriteString("\n\n")
		s.WriteString(errorStyle.Render(fmt.Sprintf("Error: %v", m.err)))
	}

	return s.String()
}

func (m *SimpleModel) updateChoices() {
	// Choices are updated in View() based on current view
}

func (m SimpleModel) loadDevicesCmd() tea.Msg {
	devices, err := m.client.ListDevices("", false)
	if err != nil {
		return errorMsg{err: err}
	}
	return devicesLoadedMsg{devices: devices}
}

// RunSimple starts the simplified TUI
func RunSimple(natsURL, natsUser, natsPass string) error {
	cl, err := client.New(natsURL, natsUser, natsPass)
	if err != nil {
		return err
	}
	defer cl.Close()

	m := SimpleModel{
		client:      cl,
		choices:     []string{"Devices", "Configurations", "Exit"},
		currentView: "menu",
	}

	p := tea.NewProgram(m, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		return err
	}

	return nil
}