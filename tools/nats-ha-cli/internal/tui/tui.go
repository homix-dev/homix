package tui

import (
	"fmt"
	"strings"

	"github.com/calmera/nats-home-automation/tools/nats-ha-cli/internal/client"
	"github.com/charmbracelet/bubbles/list"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// Styles
var (
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("230")).
			Background(lipgloss.Color("63")).
			Padding(0, 1)

	selectedStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("229")).
			Background(lipgloss.Color("57"))

	statusStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("241"))

	helpStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("241"))

	errorStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("196"))

	successStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("42"))
)

// View states
type viewState int

const (
	menuView viewState = iota
	deviceListView
	deviceDetailView
	configView
	configEditView
)

// Menu items
type menuItem struct {
	title       string
	description string
	action      viewState
}

func (i menuItem) Title() string       { return i.title }
func (i menuItem) Description() string { return i.description }
func (i menuItem) FilterValue() string { return i.title }

// Model represents the application state
type Model struct {
	// Connection
	client   *client.Client
	natsURL  string
	natsUser string
	natsPass string

	// State
	currentView viewState
	width       int
	height      int
	err         error
	message     string

	// Menu
	menuList list.Model

	// Devices
	devices      []*client.Device
	deviceList   list.Model
	selectedDevice *client.Device

	// Config
	configs      []*client.DeviceConfig
	configList   list.Model
	selectedConfig *client.DeviceConfig
	configInputs []textinput.Model
	focusIndex   int

	// Navigation
	previousView viewState
}

// Init initializes the model
func (m Model) Init() tea.Cmd {
	return tea.Batch(
		textinput.Blink,
		m.loadDevices,
	)
}

// Update handles messages
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			if m.currentView == menuView {
				return m, tea.Quit
			}
			// Go back to menu
			m.currentView = menuView
			m.err = nil
			m.message = ""
			return m, nil

		case "esc":
			if m.currentView != menuView {
				m.currentView = m.previousView
				m.err = nil
				m.message = ""
			}
			return m, nil

		case "enter", " ":
			switch m.currentView {
			case menuView:
				selected := m.menuList.SelectedItem()
				if item, ok := selected.(menuItem); ok {
					m.previousView = m.currentView
					m.currentView = item.action
					
					switch item.action {
					case deviceListView:
						cmds = append(cmds, m.loadDevices)
					case configView:
						cmds = append(cmds, m.loadConfigs)
					}
				}
			default:
				cmd := m.handleEnter()
				if cmd != nil {
					cmds = append(cmds, cmd)
				}
			}

		case "tab":
			if m.currentView == configEditView {
				m.focusIndex = (m.focusIndex + 1) % len(m.configInputs)
				for i := range m.configInputs {
					if i == m.focusIndex {
						cmds = append(cmds, m.configInputs[i].Focus())
					} else {
						m.configInputs[i].Blur()
					}
				}
			}

		case "r":
			// Refresh current view
			switch m.currentView {
			case deviceListView:
				cmds = append(cmds, m.loadDevices)
			case configView:
				cmds = append(cmds, m.loadConfigs)
			}
		}

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		h := msg.Height - 4
		if h < 1 {
			h = 1
		}
		m.menuList.SetSize(msg.Width, h)
		m.deviceList.SetSize(msg.Width, h)
		m.configList.SetSize(msg.Width, h)

	case devicesLoadedMsg:
		m.devices = msg.devices
		items := make([]list.Item, len(m.devices))
		for i, d := range m.devices {
			items[i] = deviceItem{device: d}
		}
		m.deviceList.SetItems(items)

	case configsLoadedMsg:
		m.configs = msg.configs
		items := make([]list.Item, len(m.configs))
		for i, c := range m.configs {
			items[i] = configItem{config: c}
		}
		m.configList.SetItems(items)

	case deviceDetailMsg:
		m.selectedDevice = msg.device
		m.currentView = deviceDetailView

	case configDetailMsg:
		m.selectedConfig = msg.config
		m.setupConfigInputs()
		m.currentView = configEditView

	case errorMsg:
		m.err = msg.err
		m.message = ""

	case successMsg:
		m.message = msg.message
		m.err = nil
		// Refresh after success
		switch m.currentView {
		case deviceDetailView:
			cmds = append(cmds, m.loadDevices)
		case configEditView:
			cmds = append(cmds, m.loadConfigs)
		}
	}

	// Update sub-components
	switch m.currentView {
	case menuView:
		newListModel, cmd := m.menuList.Update(msg)
		m.menuList = newListModel
		cmds = append(cmds, cmd)

	case deviceListView:
		newListModel, cmd := m.deviceList.Update(msg)
		m.deviceList = newListModel
		cmds = append(cmds, cmd)

	case configView:
		newListModel, cmd := m.configList.Update(msg)
		m.configList = newListModel
		cmds = append(cmds, cmd)

	case configEditView:
		for i := range m.configInputs {
			var cmd tea.Cmd
			m.configInputs[i], cmd = m.configInputs[i].Update(msg)
			cmds = append(cmds, cmd)
		}
	}

	return m, tea.Batch(cmds...)
}

// View renders the UI
func (m Model) View() string {
	if m.width == 0 || m.height == 0 {
		return "Loading..."
	}

	var content string

	switch m.currentView {
	case menuView:
		content = m.menuView()
	case deviceListView:
		content = m.deviceListView()
	case deviceDetailView:
		content = m.deviceDetailView()
	case configView:
		content = m.configListView()
	case configEditView:
		content = m.configEditView()
	}

	// Add status bar
	status := m.statusBar()

	return lipgloss.JoinVertical(
		lipgloss.Top,
		content,
		status,
	)
}

// View helpers

func (m Model) menuView() string {
	title := titleStyle.Render(" NATS Home Automation ")
	help := helpStyle.Render("↑/↓: Navigate • Enter: Select • q: Quit")
	
	// Debug info
	debug := ""
	if selected := m.menuList.SelectedItem(); selected != nil {
		if item, ok := selected.(menuItem); ok {
			debug = fmt.Sprintf("\nSelected: %s", item.title)
		}
	}
	
	return lipgloss.JoinVertical(
		lipgloss.Top,
		title,
		m.menuList.View(),
		help,
		debug,
	)
}

func (m Model) deviceListView() string {
	title := titleStyle.Render(" Devices ")
	help := helpStyle.Render("↑/↓: Navigate • Enter: Details • r: Refresh • q: Back")
	
	return lipgloss.JoinVertical(
		lipgloss.Top,
		title,
		m.deviceList.View(),
		help,
	)
}

func (m Model) deviceDetailView() string {
	if m.selectedDevice == nil {
		return "No device selected"
	}

	d := m.selectedDevice
	title := titleStyle.Render(fmt.Sprintf(" Device: %s ", d.Name))
	
	var details strings.Builder
	details.WriteString(fmt.Sprintf("\n  ID: %s\n", d.DeviceID))
	details.WriteString(fmt.Sprintf("  Type: %s\n", d.DeviceType))
	details.WriteString(fmt.Sprintf("  Manufacturer: %s\n", d.Manufacturer))
	details.WriteString(fmt.Sprintf("  Model: %s\n", d.Model))
	
	status := "🔴 Offline"
	if d.Status.Online {
		status = "🟢 Online"
	}
	details.WriteString(fmt.Sprintf("  Status: %s\n", status))
	details.WriteString(fmt.Sprintf("  Last Seen: %s\n", d.Status.LastSeen.Format("2006-01-02 15:04:05")))
	
	if len(d.Capabilities.Sensors) > 0 {
		details.WriteString("\n  Sensors:\n")
		for _, s := range d.Capabilities.Sensors {
			details.WriteString(fmt.Sprintf("    • %s\n", s))
		}
	}
	
	if len(d.Capabilities.Actuators) > 0 {
		details.WriteString("\n  Actuators:\n")
		for _, a := range d.Capabilities.Actuators {
			details.WriteString(fmt.Sprintf("    • %s\n", a))
		}
	}
	
	help := helpStyle.Render("Esc: Back • q: Menu")
	
	return lipgloss.JoinVertical(
		lipgloss.Top,
		title,
		details.String(),
		"",
		help,
	)
}

func (m Model) configListView() string {
	title := titleStyle.Render(" Configurations ")
	help := helpStyle.Render("↑/↓: Navigate • Enter: Edit • r: Refresh • q: Back")
	
	return lipgloss.JoinVertical(
		lipgloss.Top,
		title,
		m.configList.View(),
		help,
	)
}

func (m Model) configEditView() string {
	if m.selectedConfig == nil {
		return "No config selected"
	}

	title := titleStyle.Render(fmt.Sprintf(" Edit Config: %s ", m.selectedConfig.Name))
	
	var form strings.Builder
	form.WriteString("\n")
	
	labels := []string{"Name:", "Location:", "Enabled:"}
	for i, input := range m.configInputs {
		if i < len(labels) {
			form.WriteString(fmt.Sprintf("  %-12s %s\n", labels[i], input.View()))
		}
	}
	
	help := helpStyle.Render("Tab: Next Field • Enter: Save • Esc: Cancel")
	
	return lipgloss.JoinVertical(
		lipgloss.Top,
		title,
		form.String(),
		"",
		help,
	)
}

func (m Model) statusBar() string {
	var status string
	
	if m.err != nil {
		status = errorStyle.Render(fmt.Sprintf("Error: %v", m.err))
	} else if m.message != "" {
		status = successStyle.Render(m.message)
	} else {
		status = statusStyle.Render(fmt.Sprintf("Connected to %s", m.natsURL))
	}
	
	return lipgloss.NewStyle().
		Width(m.width).
		Padding(0, 1).
		Render(status)
}

// Run starts the TUI application
func Run(natsURL, natsUser, natsPass string) error {
	// Create client
	cl, err := client.New(natsURL, natsUser, natsPass)
	if err != nil {
		return err
	}
	defer cl.Close()

	// Create menu items
	menuItems := []list.Item{
		menuItem{
			title:       "Devices",
			description: "View and manage devices",
			action:      deviceListView,
		},
		menuItem{
			title:       "Configurations",
			description: "Manage device configurations",
			action:      configView,
		},
	}

	// Create delegates
	menuDelegate := list.NewDefaultDelegate()
	menuDelegate.ShowDescription = true
	
	deviceDelegate := list.NewDefaultDelegate()
	deviceDelegate.ShowDescription = true
	
	configDelegate := list.NewDefaultDelegate()
	configDelegate.ShowDescription = true

	// Create model
	m := Model{
		client:      cl,
		natsURL:     natsURL,
		natsUser:    natsUser,
		natsPass:    natsPass,
		currentView: menuView,
		menuList:    list.New(menuItems, menuDelegate, 80, 20),
		deviceList:  list.New([]list.Item{}, deviceDelegate, 80, 20),
		configList:  list.New([]list.Item{}, configDelegate, 80, 20),
		width:       80,
		height:      24,
	}

	m.menuList.Title = "Main Menu"
	m.menuList.SetShowStatusBar(false)
	m.menuList.SetFilteringEnabled(false)
	m.menuList.SetShowHelp(false)
	
	m.deviceList.Title = "Devices"
	m.deviceList.SetShowStatusBar(true)
	m.deviceList.SetFilteringEnabled(true)
	
	m.configList.Title = "Configurations"
	m.configList.SetShowStatusBar(true)
	m.configList.SetFilteringEnabled(true)

	// Run the program
	p := tea.NewProgram(m, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		return err
	}

	return nil
}