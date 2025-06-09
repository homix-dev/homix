"""Sensor platform for NATS Bridge integration."""
from __future__ import annotations

import json
import logging
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    PERCENTAGE,
    UnitOfTemperature,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    ATTR_DEVICE_ID,
    DOMAIN,
    SUBJECT_DEVICE_COMMAND,
)
from .discovery import DISCOVERY_SIGNAL

_LOGGER = logging.getLogger(__name__)

# Map sensor types to device classes and units
SENSOR_TYPE_MAP = {
    "temperature": {
        "device_class": SensorDeviceClass.TEMPERATURE,
        "state_class": SensorStateClass.MEASUREMENT,
        "native_unit_of_measurement": UnitOfTemperature.CELSIUS,
    },
    "humidity": {
        "device_class": SensorDeviceClass.HUMIDITY,
        "state_class": SensorStateClass.MEASUREMENT,
        "native_unit_of_measurement": PERCENTAGE,
    },
    "pressure": {
        "device_class": SensorDeviceClass.PRESSURE,
        "state_class": SensorStateClass.MEASUREMENT,
        "native_unit_of_measurement": "hPa",
    },
    "battery": {
        "device_class": SensorDeviceClass.BATTERY,
        "state_class": SensorStateClass.MEASUREMENT,
        "native_unit_of_measurement": PERCENTAGE,
    },
    "voltage": {
        "device_class": SensorDeviceClass.VOLTAGE,
        "state_class": SensorStateClass.MEASUREMENT,
        "native_unit_of_measurement": "V",
    },
    "current": {
        "device_class": SensorDeviceClass.CURRENT,
        "state_class": SensorStateClass.MEASUREMENT,
        "native_unit_of_measurement": "A",
    },
    "power": {
        "device_class": SensorDeviceClass.POWER,
        "state_class": SensorStateClass.MEASUREMENT,
        "native_unit_of_measurement": "W",
    },
    "energy": {
        "device_class": SensorDeviceClass.ENERGY,
        "state_class": SensorStateClass.TOTAL_INCREASING,
        "native_unit_of_measurement": "kWh",
    },
    "illuminance": {
        "device_class": SensorDeviceClass.ILLUMINANCE,
        "state_class": SensorStateClass.MEASUREMENT,
        "native_unit_of_measurement": "lx",
    },
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up NATS sensor platform."""
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator = data["coordinator"]
    client = data["client"]
    
    @callback
    def async_discover_sensor(device_id: str, device_data: dict[str, Any]) -> None:
        """Discover and add a sensor."""
        capabilities = device_data.get("capabilities", {})
        sensors = capabilities.get("sensors", [])
        
        entities = []
        for sensor_type in sensors:
            # Get sensor configuration
            sensor_config = SENSOR_TYPE_MAP.get(sensor_type, {})
            
            # Check if we should create multiple sensors
            if isinstance(sensor_type, dict):
                # Complex sensor definition
                sensor_name = sensor_type.get("name", "Unknown")
                sensor_key = sensor_type.get("key", sensor_name.lower())
                sensor_unit = sensor_type.get("unit")
                device_class = sensor_type.get("device_class")
            else:
                # Simple sensor type
                sensor_name = sensor_type.capitalize()
                sensor_key = sensor_type
                sensor_unit = sensor_config.get("native_unit_of_measurement")
                device_class = sensor_config.get("device_class")
            
            entity = NATSSensor(
                coordinator=coordinator,
                client=client,
                entry=entry,
                device_id=device_id,
                device_data=device_data,
                sensor_key=sensor_key,
                sensor_name=sensor_name,
                device_class=device_class,
                unit=sensor_unit,
                state_class=sensor_config.get("state_class"),
            )
            entities.append(entity)
        
        if entities:
            async_add_entities(entities)
    
    # Subscribe to discovery events
    entry.async_on_unload(
        async_dispatcher_connect(
            hass,
            f"{DISCOVERY_SIGNAL}_sensor",
            async_discover_sensor,
        )
    )
    
    # Add already discovered sensors
    for device_data in coordinator.get_devices_by_type("sensor"):
        async_discover_sensor(device_data["device_id"], device_data)


class NATSSensor(SensorEntity):
    """NATS sensor entity."""
    
    _attr_has_entity_name = True
    
    def __init__(
        self,
        coordinator,
        client,
        entry: ConfigEntry,
        device_id: str,
        device_data: dict[str, Any],
        sensor_key: str,
        sensor_name: str,
        device_class: str | None,
        unit: str | None,
        state_class: str | None,
    ) -> None:
        """Initialize NATS sensor."""
        self._coordinator = coordinator
        self._client = client
        self._entry = entry
        self._device_id = device_id
        self._device_data = device_data
        self._sensor_key = sensor_key
        
        # Entity attributes
        self._attr_unique_id = f"{device_id}_{sensor_key}"
        self._attr_name = sensor_name
        self._attr_device_class = device_class
        self._attr_native_unit_of_measurement = unit
        self._attr_state_class = state_class
        
        # Device info
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device_id)},
            name=device_data.get("name", device_id),
            manufacturer=device_data.get("manufacturer", "Unknown"),
            model=device_data.get("model", "Unknown"),
            sw_version=device_data.get("sw_version"),
        )
    
    @property
    def native_value(self) -> float | int | str | None:
        """Return the sensor value."""
        device = self._coordinator.get_device(self._device_id)
        if not device:
            return None
        
        state = device.get("state", {})
        data = state.get("data", {})
        
        # Try to get the sensor value
        value = data.get(self._sensor_key)
        
        # Convert to appropriate type
        if value is not None:
            try:
                if self._attr_state_class in [
                    SensorStateClass.MEASUREMENT,
                    SensorStateClass.TOTAL_INCREASING,
                ]:
                    return float(value)
            except (ValueError, TypeError):
                pass
        
        return value
    
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
        
        # Add health data if available
        health = device.get("health", {})
        if health:
            attrs["rssi"] = health.get("rssi")
            attrs["uptime"] = health.get("uptime")
            attrs["free_heap"] = health.get("free_heap")
        
        return attrs
    
    async def async_added_to_hass(self) -> None:
        """Run when entity about to be added to hass."""
        self.async_on_remove(
            self._coordinator.async_add_listener(self.async_write_ha_state)
        )
    
    async def async_request_refresh(self) -> None:
        """Request a data refresh from the device."""
        prefix = self._entry.data.get("discovery_prefix", "home")
        command_subject = SUBJECT_DEVICE_COMMAND.format(
            prefix=prefix,
            device_type="sensor",
            device_id=self._device_id,
        )
        
        try:
            await self._client.request(
                command_subject,
                json.dumps({"action": "read"}),
                timeout=5.0
            )
        except Exception as err:
            _LOGGER.error("Failed to request sensor refresh: %s", err)