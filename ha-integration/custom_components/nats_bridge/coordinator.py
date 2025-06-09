"""Data coordinator for NATS Bridge integration."""
from __future__ import annotations

import asyncio
from datetime import timedelta
import json
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import (
    DOMAIN,
    HEALTH_CHECK_INTERVAL,
    SUBJECT_DEVICE_HEALTH,
    SUBJECT_DEVICE_STATE,
)

_LOGGER = logging.getLogger(__name__)


class NATSCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinate NATS device data updates."""
    
    def __init__(
        self,
        hass: HomeAssistant,
        client,
        entry: ConfigEntry,
    ) -> None:
        """Initialize coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=f"{DOMAIN}_{entry.entry_id}",
            update_interval=HEALTH_CHECK_INTERVAL,
        )
        self.client = client
        self.entry = entry
        self._devices: dict[str, Any] = {}
        self._subscriptions: dict[str, str] = {}
        
    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch data from NATS."""
        # Check connection
        if not self.client.connected:
            raise UpdateFailed("NATS client not connected")
        
        # Update device health status
        for device_id, device_data in self._devices.items():
            device_data["online"] = device_data.get("last_seen", 0) > 0
        
        return self._devices
    
    @callback
    def async_add_device(self, device_id: str, device_data: dict[str, Any]) -> None:
        """Add a device to the coordinator."""
        self._devices[device_id] = device_data
        self.async_set_updated_data(self._devices)
    
    @callback
    def async_remove_device(self, device_id: str) -> None:
        """Remove a device from the coordinator."""
        if device_id in self._devices:
            self._devices.pop(device_id)
            self.async_set_updated_data(self._devices)
    
    @callback
    def async_update_device(self, device_id: str, data: dict[str, Any]) -> None:
        """Update device data."""
        if device_id in self._devices:
            self._devices[device_id].update(data)
            self.async_set_updated_data(self._devices)
    
    async def async_subscribe_device(self, device_id: str, device_type: str) -> None:
        """Subscribe to device topics."""
        prefix = self.entry.data.get("discovery_prefix", "home")
        
        # Subscribe to state updates
        state_subject = SUBJECT_DEVICE_STATE.format(
            prefix=prefix,
            device_type=device_type,
            device_id=device_id
        )
        
        async def handle_state(msg):
            """Handle state update."""
            try:
                data = json.loads(msg.data.decode())
                self.async_update_device(device_id, {"state": data})
            except Exception as err:
                _LOGGER.error("Error handling state update: %s", err)
        
        state_sub_id = await self.client.subscribe(state_subject, handle_state)
        self._subscriptions[f"{device_id}_state"] = state_sub_id
        
        # Subscribe to health updates
        health_subject = SUBJECT_DEVICE_HEALTH.format(
            prefix=prefix,
            device_type=device_type,
            device_id=device_id
        )
        
        async def handle_health(msg):
            """Handle health update."""
            try:
                data = json.loads(msg.data.decode())
                self.async_update_device(device_id, {
                    "health": data,
                    "last_seen": self.hass.loop.time(),
                    "online": True
                })
            except Exception as err:
                _LOGGER.error("Error handling health update: %s", err)
        
        health_sub_id = await self.client.subscribe(health_subject, handle_health)
        self._subscriptions[f"{device_id}_health"] = health_sub_id
    
    async def async_unsubscribe_device(self, device_id: str) -> None:
        """Unsubscribe from device topics."""
        for key in [f"{device_id}_state", f"{device_id}_health"]:
            if key in self._subscriptions:
                sub_id = self._subscriptions.pop(key)
                await self.client.unsubscribe(sub_id)
    
    def get_device(self, device_id: str) -> dict[str, Any] | None:
        """Get device data."""
        return self._devices.get(device_id)
    
    def get_devices_by_type(self, device_type: str) -> list[dict[str, Any]]:
        """Get all devices of a specific type."""
        return [
            device for device in self._devices.values()
            if device.get("device_type") == device_type
        ]