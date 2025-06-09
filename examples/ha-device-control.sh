#!/bin/bash
# Examples of controlling Home Assistant devices through NATS

# Configuration
NATS_SERVER="nats://home:changeme@localhost:4222"
NATS_OPTS="--server=$NATS_SERVER"

echo "Home Assistant Device Control via NATS"
echo "====================================="
echo

# Function to send command
send_command() {
    local device_type=$1
    local device_id=$2
    local action=$3
    local extra_params=$4
    
    local subject="home.devices.$device_type.$device_id.command"
    local payload="{\"action\":\"$action\""
    
    if [ -n "$extra_params" ]; then
        payload="$payload,$extra_params"
    fi
    payload="$payload}"
    
    echo "Sending to $subject: $payload"
    echo "$payload" | nats $NATS_OPTS pub "$subject"
}

# Function to request device status
get_status() {
    local device_type=$1
    local device_id=$2
    
    local subject="home.devices.$device_type.$device_id.command"
    echo "Getting status of $device_type.$device_id..."
    
    echo '{"action":"status"}' | nats $NATS_OPTS request "$subject" --timeout=3s
}

# Monitor all device states
monitor_devices() {
    echo "Monitoring all device states (Ctrl+C to stop)..."
    nats $NATS_OPTS sub "home.devices.*.*.state" --queue=monitor
}

# List all devices
list_devices() {
    echo "Requesting device list..."
    echo '{}' | nats $NATS_OPTS request "home.discovery.list" --timeout=5s | jq .
}

# Examples menu
show_menu() {
    echo "Select an action:"
    echo "1) List all devices"
    echo "2) Monitor device states"
    echo "3) Control a switch"
    echo "4) Control a light"
    echo "5) Control climate"
    echo "6) Get device status"
    echo "7) Create virtual sensor"
    echo "8) Run automated sequence"
    echo "9) Exit"
    echo
    read -p "Choice: " choice
    
    case $choice in
        1)
            list_devices
            ;;
        2)
            monitor_devices
            ;;
        3)
            read -p "Switch ID: " switch_id
            read -p "Action (on/off/toggle): " action
            send_command "switch" "$switch_id" "$action"
            ;;
        4)
            read -p "Light ID: " light_id
            read -p "Action (on/off/toggle): " action
            if [ "$action" = "on" ]; then
                read -p "Brightness (0-100): " brightness
                send_command "light" "$light_id" "on" "\"brightness\":$brightness"
            else
                send_command "light" "$light_id" "$action"
            fi
            ;;
        5)
            read -p "Climate ID: " climate_id
            read -p "Temperature: " temp
            send_command "climate" "$climate_id" "set_temperature" "\"temperature\":$temp"
            ;;
        6)
            read -p "Device type: " dtype
            read -p "Device ID: " did
            get_status "$dtype" "$did"
            ;;
        7)
            create_virtual_sensor
            ;;
        8)
            run_automation
            ;;
        9)
            exit 0
            ;;
        *)
            echo "Invalid choice"
            ;;
    esac
}

# Create a virtual sensor
create_virtual_sensor() {
    echo "Creating virtual motion sensor..."
    
    # Announce device
    cat <<EOF | nats $NATS_OPTS pub "home.discovery.announce"
{
  "device_id": "virtual-motion-01",
  "device_type": "binary_sensor",
  "name": "Virtual Motion Detector",
  "manufacturer": "NATS Demo",
  "model": "VM-001",
  "capabilities": {
    "binary_sensors": ["motion"],
    "attributes": ["last_motion_time", "sensitivity"]
  }
}
EOF

    echo "Virtual sensor created!"
    
    # Simulate motion
    echo "Simulating motion events..."
    for i in {1..5}; do
        state="true"
        [ $((i % 2)) -eq 0 ] && state="false"
        
        cat <<EOF | nats $NATS_OPTS pub "home.devices.binary_sensor.virtual-motion-01.state"
{
  "device_id": "virtual-motion-01",
  "state": $state,
  "attributes": {
    "last_motion_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "sensitivity": "high"
  }
}
EOF
        echo "  Motion: $state"
        sleep 3
    done
}

# Run an automated sequence
run_automation() {
    echo "Running 'Good Night' automation sequence..."
    
    # Turn off all lights
    echo "1. Turning off lights..."
    for light in living_room kitchen bedroom bathroom; do
        send_command "light" "$light" "off"
        sleep 0.5
    done
    
    # Lock doors
    echo "2. Locking doors..."
    for lock in front_door back_door garage; do
        send_command "lock" "$lock" "lock"
        sleep 0.5
    done
    
    # Set thermostat to night mode
    echo "3. Setting thermostat to night mode..."
    send_command "climate" "thermostat" "set_temperature" "\"temperature\":18,\"mode\":\"sleep\""
    
    # Close blinds
    echo "4. Closing blinds..."
    for cover in bedroom_blinds living_room_curtains; do
        send_command "cover" "$cover" "close"
        sleep 0.5
    done
    
    # Turn on security system
    echo "5. Arming security system..."
    send_command "alarm_control_panel" "home_security" "arm_night"
    
    echo "✓ Good night sequence completed!"
}

# Main loop
while true; do
    echo
    show_menu
    echo
    read -p "Press Enter to continue..."
done