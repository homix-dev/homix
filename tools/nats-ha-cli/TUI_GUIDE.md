# TUI Usage Guide

## Launching the TUI

```bash
./nats-ha tui --server nats://localhost:4222 --user home --password changeme
```

## Navigation

The TUI uses a simple menu-driven interface:

### Main Menu
- **Devices** - View and browse connected devices
- **Configurations** - Manage device configurations
- **Exit** - Quit the application

### Controls
- **↑/↓** or **j/k** - Move cursor up/down
- **Enter** or **Space** - Select item
- **Esc** - Go back to previous menu
- **q** or **Ctrl+C** - Quit application

### Device View
When viewing devices:
- 🟢 indicates device is online
- 🔴 indicates device is offline
- Select a device to see detailed information
- Select "← Back" to return to main menu

### Device Details
Shows:
- Device ID
- Name
- Type
- Online status
- Last seen time

## Troubleshooting

### TUI not displaying correctly
- Ensure your terminal supports UTF-8
- Try resizing your terminal window
- Use a modern terminal emulator (iTerm2, Windows Terminal, etc.)

### Can't select menu items
- Make sure to use arrow keys or j/k for navigation
- Press Enter or Space to select
- The `>` symbol indicates the currently selected item

### Connection issues
- Verify NATS server is running
- Check credentials are correct
- Ensure network connectivity

## Alternative: Full-featured TUI

To use the full-featured TUI (with list components):
```bash
./nats-ha tui --simple=false --server nats://localhost:4222 --user home --password changeme
```

Note: The simplified TUI is currently the default as it's more reliable across different terminal environments.