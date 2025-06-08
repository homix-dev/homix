#!/bin/bash

# NATS Home Automation CLI Demo
# This script demonstrates various CLI features

# Configuration
SERVER="nats://localhost:4222"
USER="home"
PASSWORD="changeme"
CLI="../nats-ha"

# Helper function for section headers
section() {
    echo
    echo "=== $1 ==="
    echo
}

# Helper function for commands
run_cmd() {
    echo "$ $1"
    eval "$1"
    echo
}

echo "NATS Home Automation CLI Demo"
echo "============================="

section "1. Device Management"

run_cmd "$CLI device list --server $SERVER --user $USER --password $PASSWORD"

run_cmd "$CLI device list --type sensor --online --server $SERVER --user $USER --password $PASSWORD"

run_cmd "$CLI device get test-temp-01 --server $SERVER --user $USER --password $PASSWORD"

section "2. Configuration Management"

run_cmd "$CLI config get test-temp-01 --server $SERVER --user $USER --password $PASSWORD"

run_cmd "$CLI config list --server $SERVER --user $USER --password $PASSWORD"

section "3. Real-time Monitoring"

echo "To watch real-time state changes:"
echo "$ $CLI watch states --server $SERVER --user $USER --password $PASSWORD"
echo
echo "To watch specific device type:"
echo "$ $CLI watch states sensor --server $SERVER --user $USER --password $PASSWORD"
echo
echo "To watch system events:"
echo "$ $CLI watch events --server $SERVER --user $USER --password $PASSWORD"
echo
echo "To watch device discovery:"
echo "$ $CLI watch discovery --server $SERVER --user $USER --password $PASSWORD"

section "4. JSON Output for Scripting"

run_cmd "$CLI device list --output json --server $SERVER --user $USER --password $PASSWORD | jq '.[] | {id: .device_id, name: .name, online: .status.online}'"

section "5. Configuration Backup"

run_cmd "$CLI config backup --description 'Demo backup' --server $SERVER --user $USER --password $PASSWORD"

section "6. TUI Mode"

echo "To launch the interactive Terminal UI:"
echo "$ $CLI tui --server $SERVER --user $USER --password $PASSWORD"
echo
echo "The TUI provides an easy-to-use interface for:"
echo "  - Viewing devices with live status"
echo "  - Editing configurations interactively"
echo "  - Navigating with keyboard shortcuts"

section "Demo Complete"

echo "For more information:"
echo "  - Run '$CLI --help' for all commands"
echo "  - Run '$CLI <command> --help' for command-specific help"
echo "  - See README.md for detailed documentation"