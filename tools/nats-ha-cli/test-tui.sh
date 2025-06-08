#!/bin/bash

echo "Testing NATS HA CLI..."
echo

# Test basic commands first
echo "1. Testing device list:"
./nats-ha device list --server nats://localhost:4222 --user home --password changeme

echo
echo "2. Testing config get:"
./nats-ha config get test-temp-01 --server nats://localhost:4222 --user home --password changeme

echo
echo "3. To test the TUI, run:"
echo "   ./nats-ha tui --server nats://localhost:4222 --user home --password changeme"
echo
echo "   TUI Navigation:"
echo "   - Use arrow keys (↑/↓) to navigate"
echo "   - Press Enter or Space to select"
echo "   - Press 'q' to quit from main menu"
echo "   - Press Esc to go back"