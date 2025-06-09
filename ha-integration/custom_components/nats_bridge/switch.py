"""Switch platform for NATS Bridge integration."""
from __future__ import annotations

import json
import logging
from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    CONF_COMMAND_TIMEOUT,
    DEFAULT_COMMAND_TIMEOUT,
    DOMAIN,
    SUBJECT_DEVICE_COMMAND,
)
from .discovery import DISCOVERY_SIGNAL

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up NATS switch platform."""
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator = data["coordinator"]
    client = data["client"]
    
    @callback
    def async_discover_switch(device_id: str, device_data: dict[str, Any]) -> None:
        """Discover and add a switch."""
        entity = NATSSwitch(
            coordinator=coordinator,
            client=client,
            entry=entry,
            device_id=device_id,
            device_data=device_data,
        )
        async_add_entities([entity])
    
    # Subscribe to discovery events
    entry.async_on_unload(
        async_dispatcher_connect(
            hass,
            f"{DISCOVERY_SIGNAL}_switch",
            async_discover_switch,
        )
    )
    
    # Add already discovered switches
    for device_data in coordinator.get_devices_by_type("switch"):
        async_discover_switch(device_data["device_id"], device_data)


class NATSSwitch(SwitchEntity):
    """NATS switch entity."""
    
    _attr_has_entity_name = True
    
    def __init__(
        self,
        coordinator,
        client,
        entry: ConfigEntry,
        device_id: str,
        device_data: dict[str, Any],
    ) -> None:
        """Initialize NATS switch."""
        self._coordinator = coordinator
        self._client = client
        self._entry = entry
        self._device_id = device_id
        self._device_data = device_data
        
        # Entity attributes
        self._attr_unique_id = device_id
        self._attr_name = None  # Use device name
        
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
        """Return true if switch is on."""
        device = self._coordinator.get_device(self._device_id)
        if not device:
            return None
        
        state = device.get("state", {})
        
        # Check various state formats
        if "state" in state:
            state_value = state["state"]
            if isinstance(state_value, bool):
                return state_value
            elif isinstance(state_value, str):
                return state_value.lower() in ("on", "true", "1")
        
        # Check in data
        data = state.get("data", {})
        if "state" in data:
            return data["state"] in ("on", True, 1)
        
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
        
        # Add device-specific attributes
        state = device.get("state", {})
        
        # Timer info if available
        if "timer_active" in state:
            attrs["timer_active"] = state["timer_active"]
        if "timer_remaining" in state:
            attrs["timer_remaining"] = state["timer_remaining"]
        
        # Switch count if available
        if "switch_count" in state:
            attrs["switch_count"] = state["switch_count"]
        
        # Last change time
        if "last_change" in state:
            attrs["last_change"] = state["last_change"]
        
        return attrs
    
    async def async_turn_on(self, **kwargs: Any) -> None:
        """Turn the switch on."""
        await self._send_command("on")
    
    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn the switch off."""
        await self._send_command("off")
    
    async def async_toggle(self, **kwargs: Any) -> None:
        """Toggle the switch."""
        await self._send_command("toggle")
    
    async def _send_command(self, action: str) -> None:
        """Send command to the switch."""
        prefix = self._entry.data.get("discovery_prefix", "home")
        command_subject = SUBJECT_DEVICE_COMMAND.format(
            prefix=prefix,
            device_type="switch",
            device_id=self._device_id,
        )
        
        timeout = self._entry.data.get(CONF_COMMAND_TIMEOUT, DEFAULT_COMMAND_TIMEOUT)
        
        try:
            response = await self._client.request(
                command_subject,
                json.dumps({"action": action}),
                timeout=timeout
            )
            _LOGGER.debug("Command response: %s", response)
            
            # Request state update
            await self._coordinator.async_request_refresh()
            
        except Exception as err:
            _LOGGER.error("Failed to send command to switch %s: %s", 
                         self._device_id, err)
    
    async def async_added_to_hass(self) -> None:
        """Run when entity about to be added to hass."""
        self.async_on_remove(
            self._coordinator.async_add_listener(self.async_write_ha_state)
        )