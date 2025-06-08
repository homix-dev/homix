#!/bin/bash

# Configuration Management Examples
# 
# This script demonstrates configuration management operations

# Configuration
NATS_URL="nats://home:changeme@localhost:4222"

echo "=== NATS Configuration Management Examples ==="
echo "Using server: $NATS_URL"
echo

# Helper function for pausing between examples
pause() {
    echo
    echo "Press Enter to continue..."
    read
}

# 1. Set device configuration
echo "1. Setting device configuration for a sensor..."
SENSOR_CONFIG='{
  "command": "set_device_config",
  "params": {
    "device_type": "sensor",
    "config": {
      "device_id": "temp01",
      "name": "Living Room Temperature",
      "location": "Living Room",
      "enabled": true,
      "settings": {
        "update_interval": 30,
        "retain_history": true,
        "calibration_offset": 0.5
      },
      "thresholds": {
        "temperature": {
          "min": 15,
          "max": 30,
          "unit": "celsius",
          "action": "alert",
          "cooldown": 300
        }
      }
    }
  }
}'

nats request home.services.config.command "$SENSOR_CONFIG" -s $NATS_URL --timeout 2s
pause

# 2. Get device configuration
echo "2. Getting device configuration..."
nats request home.services.config.command '{
  "command": "get_device_config",
  "params": {"device_id": "temp01"}
}' -s $NATS_URL --timeout 2s
pause

# 3. Direct config access via subject
echo "3. Direct config access via subject..."
nats request home.config.device.temp01 '' -s $NATS_URL --timeout 2s
pause

# 4. Set light configuration
echo "4. Setting configuration for a light..."
LIGHT_CONFIG='{
  "command": "set_device_config",
  "params": {
    "device_type": "light",
    "config": {
      "device_id": "light01",
      "name": "Kitchen Light",
      "location": "Kitchen",
      "enabled": true,
      "settings": {
        "transition_time": 2,
        "min_brightness": 10,
        "max_brightness": 100,
        "color_temp_min": 2700,
        "color_temp_max": 6500,
        "default_brightness": 75
      },
      "automations": [
        {
          "id": "auto1",
          "name": "Motion activated",
          "trigger": "motion_detected",
          "condition": {"time": "after_sunset"},
          "action": {"brightness": 50},
          "enabled": true
        }
      ]
    }
  }
}'

nats request home.services.config.command "$LIGHT_CONFIG" -s $NATS_URL --timeout 2s
pause

# 5. List all device configurations
echo "5. Listing all device configurations..."
nats request home.services.config.command '{
  "command": "list_device_configs",
  "params": {}
}' -s $NATS_URL --timeout 2s
pause

# 6. Set system configuration
echo "6. Setting system-wide configuration..."
SYSTEM_CONFIG='{
  "command": "set_system_config",
  "params": {
    "config": {
      "component": "discovery",
      "settings": {
        "announce_interval": 60,
        "cleanup_interval": 300,
        "max_devices": 500,
        "enable_auto_discovery": true,
        "allowed_device_types": ["sensor", "switch", "light", "binary_sensor"]
      }
    }
  }
}'

nats request home.services.config.command "$SYSTEM_CONFIG" -s $NATS_URL --timeout 2s
pause

# 7. Create configuration backup
echo "7. Creating configuration backup..."
nats request home.services.config.command '{
  "command": "create_backup",
  "params": {"description": "Test backup before changes"}
}' -s $NATS_URL --timeout 2s
pause

# 8. Set configuration schema for custom device type
echo "8. Setting configuration schema for a custom thermostat device..."
SCHEMA='{
  "command": "set_config_schema",
  "params": {
    "device_type": "thermostat",
    "schema": {
      "device_type": "thermostat",
      "fields": {
        "target_temperature": {
          "type": "number",
          "description": "Target temperature setpoint",
          "default": 20,
          "min": 10,
          "max": 30,
          "required": true
        },
        "mode": {
          "type": "string",
          "description": "Operating mode",
          "default": "auto",
          "enum": ["off", "heat", "cool", "auto"],
          "required": true
        },
        "hysteresis": {
          "type": "number",
          "description": "Temperature hysteresis",
          "default": 0.5,
          "min": 0.1,
          "max": 2
        },
        "schedule_enabled": {
          "type": "boolean",
          "description": "Enable scheduling",
          "default": false
        }
      },
      "required": ["target_temperature", "mode"]
    }
  }
}'

nats request home.services.config.command "$SCHEMA" -s $NATS_URL --timeout 2s
pause

# 9. Test validation with the schema
echo "9. Setting thermostat configuration (will be validated against schema)..."
THERMOSTAT_CONFIG='{
  "command": "set_device_config",
  "params": {
    "device_type": "thermostat",
    "config": {
      "device_id": "thermostat01",
      "name": "Living Room Thermostat",
      "location": "Living Room",
      "enabled": true,
      "settings": {
        "target_temperature": 22,
        "mode": "auto",
        "hysteresis": 0.5,
        "schedule_enabled": true
      }
    }
  }
}'

nats request home.services.config.command "$THERMOSTAT_CONFIG" -s $NATS_URL --timeout 2s
pause

# 10. Test invalid configuration (should fail validation)
echo "10. Testing invalid configuration (missing required field)..."
INVALID_CONFIG='{
  "command": "set_device_config",
  "params": {
    "device_type": "thermostat",
    "config": {
      "device_id": "thermostat02",
      "name": "Bad Thermostat",
      "enabled": true,
      "settings": {
        "hysteresis": 0.5
      }
    }
  }
}'

echo "This should fail with validation error:"
nats request home.services.config.command "$INVALID_CONFIG" -s $NATS_URL --timeout 2s
pause

echo "=== Configuration examples completed ==="
echo
echo "Configuration subjects:"
echo "- home.config.device.{device_id} - Get device config"
echo "- home.services.config.command - Configuration management commands"
echo
echo "Available commands:"
echo "- set_device_config"
echo "- get_device_config"
echo "- delete_device_config"
echo "- list_device_configs"
echo "- set_system_config"
echo "- get_system_config"
echo "- create_backup"
echo "- restore_backup"
echo "- set_config_schema"