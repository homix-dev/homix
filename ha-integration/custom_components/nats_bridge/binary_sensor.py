"""Binary sensor platform for NATS Bridge integration."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .discovery import DISCOVERY_SIGNAL

_LOGGER = logging.getLogger(__name__)

# Map binary sensor types to device classes
BINARY_SENSOR_TYPE_MAP = {
    "motion": BinarySensorDeviceClass.MOTION,
    "door": BinarySensorDeviceClass.DOOR,
    "window": BinarySensorDeviceClass.WINDOW,
    "garage_door": BinarySensorDeviceClass.GARAGE_DOOR,
    "opening": BinarySensorDeviceClass.OPENING,
    "presence": BinarySensorDeviceClass.PRESENCE,
    "occupancy": BinarySensorDeviceClass.OCCUPANCY,
    "smoke": BinarySensorDeviceClass.SMOKE,
    "moisture": BinarySensorDeviceClass.MOISTURE,
    "light": BinarySensorDeviceClass.LIGHT,
    "safety": BinarySensorDeviceClass.SAFETY,
    "problem": BinarySensorDeviceClass.PROBLEM,
    "tamper": BinarySensorDeviceClass.TAMPER,
    "vibration": BinarySensorDeviceClass.VIBRATION,
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up NATS binary sensor platform."""
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator = data["coordinator"]
    
    @callback
    def async_discover_binary_sensor(device_id: str, device_data: dict[str, Any]) -> None:
        """Discover and add a binary sensor."""
        capabilities = device_data.get("capabilities", {})
        sensors = capabilities.get("binary_sensors", [])
        
        entities = []
        for sensor_type in sensors:
            # Get sensor configuration
            if isinstance(sensor_type, dict):
                # Complex sensor definition
                sensor_name = sensor_type.get("name", "Unknown")
                sensor_key = sensor_type.get("key", sensor_name.lower())
                device_class = sensor_type.get("device_class")
            else:
                # Simple sensor type
                sensor_name = sensor_type.replace("_", " ").capitalize()
                sensor_key = sensor_type
                device_class = BINARY_SENSOR_TYPE_MAP.get(sensor_type)
            
            entity = NATSBinarySensor(
                coordinator=coordinator,
                entry=entry,
                device_id=device_id,
                device_data=device_data,
                sensor_key=sensor_key,
                sensor_name=sensor_name,
                device_class=device_class,
            )
            entities.append(entity)
        
        if entities:
            async_add_entities(entities)
    
    # Subscribe to discovery events
    entry.async_on_unload(
        async_dispatcher_connect(
            hass,
            f"{DISCOVERY_SIGNAL}_binary_sensor",
            async_discover_binary_sensor,
        )
    )
    
    # Add already discovered binary sensors
    for device_data in coordinator.get_devices_by_type("binary_sensor"):
        async_discover_binary_sensor(device_data["device_id"], device_data)


class NATSBinarySensor(BinarySensorEntity):
    """NATS binary sensor entity."""
    
    _attr_has_entity_name = True
    
    def __init__(
        self,
        coordinator,
        entry: ConfigEntry,
        device_id: str,
        device_data: dict[str, Any],
        sensor_key: str,
        sensor_name: str,
        device_class: str | None,
    ) -> None:
        """Initialize NATS binary sensor."""
        self._coordinator = coordinator
        self._entry = entry
        self._device_id = device_id
        self._device_data = device_data
        self._sensor_key = sensor_key
        
        # Entity attributes
        self._attr_unique_id = f"{device_id}_{sensor_key}"
        self._attr_name = sensor_name
        self._attr_device_class = device_class
        
        # Device info
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device_id)},
            name=device_data.get("name", device_id),
            manufacturer=device_data.get("manufacturer", "Unknown"),
            model=device_data.get("model", "Unknown"),
            sw_version=device_data.get("sw_version"),
        )
    
    @property
    def is_on(self) -> bool | None:
        """Return true if the binary sensor is on."""
        device = self._coordinator.get_device(self._device_id)
        if not device:
            return None
        
        state = device.get("state", {})
        
        # First check if we have a direct state value
        if "state" in state and isinstance(state["state"], bool):
            return state["state"]
        
        # Then check in data
        data = state.get("data", {})
        value = data.get(self._sensor_key)
        
        if value is None:
            return None
        
        # Convert to boolean
        if isinstance(value, bool):
            return value
        elif isinstance(value, str):
            return value.lower() in ("on", "true", "1", "yes", "active", "detected")
        elif isinstance(value, (int, float)):
            return bool(value)
        
        return None
    
    @property
    def available(self) -> bool:
        """Return if entity is available."""
        device = self._coordinator.get_device(self._device_id)
        return device is not None and device.get("online", False)
    
    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return extra state attributes."""
        device = self._coordinator.get_device(self._device_id)
        if not device:
            return {}
        
        attrs = {
            "device_id": self._device_id,
            "last_seen": device.get("last_seen"),
        }
        
        # Add any additional sensor data
        state = device.get("state", {})
        data = state.get("data", {})
        
        # Add related data (e.g., last_motion_time for motion sensors)
        for key, value in data.items():
            if key != self._sensor_key and key.startswith(self._sensor_key):
                attrs[key] = value
        
        return attrs
    
    async def async_added_to_hass(self) -> None:
        """Run when entity about to be added to hass."""
        self.async_on_remove(
            self._coordinator.async_add_listener(self.async_write_ha_state)
        )