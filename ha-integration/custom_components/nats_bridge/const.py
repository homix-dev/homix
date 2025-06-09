"""Constants for the NATS Bridge integration."""
from datetime import timedelta
from typing import Final

# Domain
DOMAIN: Final = "nats_bridge"

# Configuration keys
CONF_NATS_SERVER: Final = "nats_server"
CONF_NATS_PORT: Final = "nats_port"
CONF_NATS_USER: Final = "nats_user"
CONF_NATS_PASSWORD: Final = "nats_password"
CONF_NATS_TOKEN: Final = "nats_token"
CONF_DISCOVERY_PREFIX: Final = "discovery_prefix"
CONF_COMMAND_TIMEOUT: Final = "command_timeout"

# Defaults
DEFAULT_PORT: Final = 4222
DEFAULT_DISCOVERY_PREFIX: Final = "home"
DEFAULT_COMMAND_TIMEOUT: Final = 5  # seconds

# NATS Subject patterns
SUBJECT_DEVICE_STATE: Final = "{prefix}.devices.{device_type}.{device_id}.state"
SUBJECT_DEVICE_COMMAND: Final = "{prefix}.devices.{device_type}.{device_id}.command"
SUBJECT_DEVICE_EVENT: Final = "{prefix}.devices.{device_type}.{device_id}.event"
SUBJECT_DEVICE_HEALTH: Final = "{prefix}.devices.{device_type}.{device_id}.health"
SUBJECT_DISCOVERY_ANNOUNCE: Final = "{prefix}.discovery.announce"
SUBJECT_CONFIG_DEVICE: Final = "{prefix}.config.device.{device_id}"

# Entity type mapping
DEVICE_TYPE_TO_PLATFORM: Final = {
    "sensor": "sensor",
    "binary_sensor": "binary_sensor",
    "switch": "switch",
    "light": "light",
    "climate": "climate",
    "cover": "cover",
    "fan": "fan",
    "lock": "lock",
    "number": "number",
    "select": "select",
    "button": "button",
    "text": "text",
}

# Update intervals
HEALTH_CHECK_INTERVAL: Final = timedelta(seconds=60)
DISCOVERY_INTERVAL: Final = timedelta(seconds=300)

# Service names
SERVICE_PUBLISH: Final = "publish"
SERVICE_REQUEST: Final = "request"
SERVICE_RELOAD: Final = "reload"

# Attributes
ATTR_SUBJECT: Final = "subject"
ATTR_PAYLOAD: Final = "payload"
ATTR_TIMEOUT: Final = "timeout"
ATTR_DEVICE_ID: Final = "device_id"
ATTR_DEVICE_TYPE: Final = "device_type"
ATTR_DEVICE_NAME: Final = "device_name"
ATTR_MANUFACTURER: Final = "manufacturer"
ATTR_MODEL: Final = "model"
ATTR_SW_VERSION: Final = "sw_version"
ATTR_CAPABILITIES: Final = "capabilities"

# Events
EVENT_NATS_MESSAGE: Final = f"{DOMAIN}_message"
EVENT_DEVICE_DISCOVERED: Final = f"{DOMAIN}_device_discovered"
EVENT_CONNECTION_STATE: Final = f"{DOMAIN}_connection_state"

# Storage
STORAGE_KEY: Final = DOMAIN
STORAGE_VERSION: Final = 1