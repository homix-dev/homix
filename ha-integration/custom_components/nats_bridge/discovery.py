"""Device discovery for NATS Bridge integration."""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    ATTR_CAPABILITIES,
    ATTR_DEVICE_ID,
    ATTR_DEVICE_NAME,
    ATTR_DEVICE_TYPE,
    ATTR_MANUFACTURER,
    ATTR_MODEL,
    ATTR_SW_VERSION,
    DEVICE_TYPE_TO_PLATFORM,
    DOMAIN,
    EVENT_DEVICE_DISCOVERED,
    SUBJECT_DISCOVERY_ANNOUNCE,
)

_LOGGER = logging.getLogger(__name__)

DISCOVERY_SIGNAL = f"{DOMAIN}_device_discovered"


class NATSDiscovery:
    """Handle NATS device discovery."""
    
    def __init__(
        self,
        hass: HomeAssistant,
        client,
        coordinator,
        entry: ConfigEntry,
    ) -> None:
        """Initialize discovery."""
        self.hass = hass
        self.client = client
        self.coordinator = coordinator
        self.entry = entry
        self._discovery_sub_id: str | None = None
        self._discovered_devices: set[str] = set()
        
    async def start(self) -> None:
        """Start discovery."""
        prefix = self.entry.data.get("discovery_prefix", "home")
        discovery_subject = SUBJECT_DISCOVERY_ANNOUNCE.format(prefix=prefix)
        
        async def handle_discovery(msg):
            """Handle discovery message."""
            try:
                data = json.loads(msg.data.decode())
                await self._process_discovery(data)
            except Exception as err:
                _LOGGER.error("Error processing discovery message: %s", err)
        
        self._discovery_sub_id = await self.client.subscribe(
            discovery_subject, handle_discovery
        )
        
        _LOGGER.info("Started device discovery on %s", discovery_subject)
        
        # Request discovery from all devices
        await self._request_discovery()
    
    async def stop(self) -> None:
        """Stop discovery."""
        if self._discovery_sub_id:
            await self.client.unsubscribe(self._discovery_sub_id)
            self._discovery_sub_id = None
    
    async def _request_discovery(self) -> None:
        """Send discovery request to all devices."""
        prefix = self.entry.data.get("discovery_prefix", "home")
        request_subject = f"{prefix}.discovery.request"
        
        try:
            await self.client.publish(request_subject, b"{}")
        except Exception as err:
            _LOGGER.error("Failed to send discovery request: %s", err)
    
    async def _process_discovery(self, data: dict[str, Any]) -> None:
        """Process a discovery message."""
        device_id = data.get(ATTR_DEVICE_ID)
        if not device_id:
            _LOGGER.warning("Discovery message missing device_id")
            return
        
        device_type = data.get(ATTR_DEVICE_TYPE, "unknown")
        
        # Check if device type is supported
        if device_type not in DEVICE_TYPE_TO_PLATFORM:
            _LOGGER.warning("Unsupported device type: %s", device_type)
            return
        
        # Check if already discovered
        if device_id in self._discovered_devices:
            _LOGGER.debug("Device %s already discovered", device_id)
            return
        
        _LOGGER.info("Discovered new device: %s (%s)", device_id, device_type)
        
        # Mark as discovered
        self._discovered_devices.add(device_id)
        
        # Create device entry
        device_registry = dr.async_get(self.hass)
        device_entry = device_registry.async_get_or_create(
            config_entry_id=self.entry.entry_id,
            identifiers={(DOMAIN, device_id)},
            name=data.get(ATTR_DEVICE_NAME, device_id),
            manufacturer=data.get(ATTR_MANUFACTURER, "Unknown"),
            model=data.get(ATTR_MODEL, "Unknown"),
            sw_version=data.get(ATTR_SW_VERSION),
        )
        
        # Store device data
        device_data = {
            "device_id": device_id,
            "device_type": device_type,
            "device_entry_id": device_entry.id,
            "name": data.get(ATTR_DEVICE_NAME, device_id),
            "capabilities": data.get(ATTR_CAPABILITIES, {}),
            "online": True,
            "last_seen": self.hass.loop.time(),
        }
        
        # Add to coordinator
        self.coordinator.async_add_device(device_id, device_data)
        
        # Subscribe to device topics
        await self.coordinator.async_subscribe_device(device_id, device_type)
        
        # Fire event
        self.hass.bus.async_fire(
            EVENT_DEVICE_DISCOVERED,
            {
                "device_id": device_id,
                "device_type": device_type,
                "name": device_data["name"],
            }
        )
        
        # Notify platforms
        async_dispatcher_send(
            self.hass,
            f"{DISCOVERY_SIGNAL}_{device_type}",
            device_id,
            device_data
        )
        
        _LOGGER.debug("Device %s added to platform %s", device_id, device_type)