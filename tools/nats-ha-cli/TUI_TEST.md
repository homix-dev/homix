# Testing the Complex TUI

## Quick Test Commands

Test the full-featured TUI:
```bash
./nats-ha tui --server nats://localhost:4222 --user home --password changeme
```

Test the simple TUI (fallback):
```bash
./nats-ha tui --simple --server nats://localhost:4222 --user home --password changeme
```

## What to Expect

### Full-Featured TUI
- Rich list interface with filtering
- Smooth navigation with arrow keys
- Search functionality (type `/` to filter)
- Status bar showing item count
- Debug info showing selected item (at bottom of menu)

### Navigation Tips
1. **In Main Menu**:
   - Use ↑/↓ to navigate between Devices and Configurations
   - Press Enter to select
   - You should see "Selected: Devices" or "Selected: Configurations" at the bottom
   - Press q to quit

2. **In Device List**:
   - Devices show with 🟢 (online) or 🔴 (offline) status
   - Press Enter to view device details
   - Press r to refresh the list
   - Press / to filter devices
   - Press q to return to main menu

3. **In Device Details**:
   - Shows full device information
   - Press Esc to go back to device list
   - Press q to return to main menu

## Troubleshooting

If the menu selection doesn't work:
1. Make sure you're using arrow keys (not j/k in the complex TUI)
2. Look for the highlight bar that moves with arrow keys
3. Check the debug text at the bottom showing which item is selected
4. Try pressing Space instead of Enter

The complex TUI uses the Bubble Tea list component which provides:
- Better visual feedback
- Filtering capabilities
- Pagination for long lists
- Customizable styling