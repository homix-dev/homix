"""The NATS Bridge integration."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

import nats
from nats.errors import ConnectionClosedError, TimeoutError
from nats.js import JetStreamContext

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    CONF_HOST,
    CONF_PASSWORD,
    CONF_PORT,
    CONF_TOKEN,
    CONF_USERNAME,
    EVENT_HOMEASSISTANT_STOP,
    Platform,
)
from homeassistant.core import Event, HomeAssistant, ServiceCall
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.storage import Store

from .const import (
    ATTR_DEVICE_ID,
    ATTR_PAYLOAD,
    ATTR_SUBJECT,
    ATTR_TIMEOUT,
    CONF_COMMAND_TIMEOUT,
    CONF_DISCOVERY_PREFIX,
    DEFAULT_COMMAND_TIMEOUT,
    DEFAULT_DISCOVERY_PREFIX,
    DEVICE_TYPE_TO_PLATFORM,
    DOMAIN,
    EVENT_CONNECTION_STATE,
    SERVICE_PUBLISH,
    SERVICE_REQUEST,
    SERVICE_RELOAD,
    STORAGE_KEY,
    STORAGE_VERSION,
    SUBJECT_DISCOVERY_ANNOUNCE,
)
from .coordinator import NATSCoordinator
from .discovery import NATSDiscovery

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.SWITCH,
    Platform.LIGHT,
    Platform.CLIMATE,
    Platform.COVER,
    Platform.FAN,
    Platform.LOCK,
    Platform.NUMBER,
    Platform.SELECT,
    Platform.BUTTON,
    Platform.TEXT,
]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up NATS Bridge from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    
    # Create NATS client
    client = NATSClient(hass, entry)
    
    # Connect to NATS
    try:
        await client.connect()
    except Exception as err:
        _LOGGER.error("Failed to connect to NATS server: %s", err)
        raise ConfigEntryNotReady from err
    
    # Create coordinator
    coordinator = NATSCoordinator(hass, client, entry)
    
    # Create discovery handler
    discovery = NATSDiscovery(hass, client, coordinator, entry)
    
    # Store references
    hass.data[DOMAIN][entry.entry_id] = {
        "client": client,
        "coordinator": coordinator,
        "discovery": discovery,
        "devices": {},
        "unsubscribe": [],
    }
    
    # Start discovery
    await discovery.start()
    
    # Register services
    await _register_services(hass)
    
    # Set up platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    # Handle shutdown
    async def _handle_shutdown(event: Event) -> None:
        """Handle Home Assistant shutdown."""
        await client.disconnect()
    
    entry.async_on_unload(
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, _handle_shutdown)
    )
    
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    # Unload platforms
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    
    if unload_ok:
        # Stop discovery
        data = hass.data[DOMAIN][entry.entry_id]
        await data["discovery"].stop()
        
        # Disconnect NATS client
        await data["client"].disconnect()
        
        # Clean up
        hass.data[DOMAIN].pop(entry.entry_id)
        
        # Unregister services if no more entries
        if not hass.data[DOMAIN]:
            _unregister_services(hass)
            hass.data.pop(DOMAIN)
    
    return unload_ok


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload config entry."""
    await async_unload_entry(hass, entry)
    await async_setup_entry(hass, entry)


async def _register_services(hass: HomeAssistant) -> None:
    """Register NATS Bridge services."""
    
    async def handle_publish(call: ServiceCall) -> None:
        """Handle publish service call."""
        subject = call.data[ATTR_SUBJECT]
        payload = call.data[ATTR_PAYLOAD]
        
        # Get first available client
        for entry_data in hass.data[DOMAIN].values():
            if isinstance(entry_data, dict) and "client" in entry_data:
                client = entry_data["client"]
                await client.publish(subject, payload)
                _LOGGER.debug("Published to %s: %s", subject, payload)
                return
        
        _LOGGER.error("No NATS client available")
    
    async def handle_request(call: ServiceCall) -> dict[str, Any]:
        """Handle request service call."""
        subject = call.data[ATTR_SUBJECT]
        payload = call.data[ATTR_PAYLOAD]
        timeout = call.data.get(ATTR_TIMEOUT, DEFAULT_COMMAND_TIMEOUT)
        
        # Get first available client
        for entry_data in hass.data[DOMAIN].values():
            if isinstance(entry_data, dict) and "client" in entry_data:
                client = entry_data["client"]
                response = await client.request(subject, payload, timeout)
                return {"response": response}
        
        _LOGGER.error("No NATS client available")
        return {"error": "No NATS client available"}
    
    async def handle_reload(call: ServiceCall) -> None:
        """Handle reload service call."""
        # Reload all config entries
        for entry_id in list(hass.data[DOMAIN].keys()):
            if entry_id != "services_registered":
                entry = hass.config_entries.async_get_entry(entry_id)
                if entry:
                    await async_reload_entry(hass, entry)
    
    # Register services only once
    if "services_registered" not in hass.data[DOMAIN]:
        hass.services.async_register(DOMAIN, SERVICE_PUBLISH, handle_publish)
        hass.services.async_register(DOMAIN, SERVICE_REQUEST, handle_request)
        hass.services.async_register(DOMAIN, SERVICE_RELOAD, handle_reload)
        hass.data[DOMAIN]["services_registered"] = True


def _unregister_services(hass: HomeAssistant) -> None:
    """Unregister NATS Bridge services."""
    hass.services.async_remove(DOMAIN, SERVICE_PUBLISH)
    hass.services.async_remove(DOMAIN, SERVICE_REQUEST)
    hass.services.async_remove(DOMAIN, SERVICE_RELOAD)


class NATSClient:
    """NATS client wrapper."""
    
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize NATS client."""
        self.hass = hass
        self.entry = entry
        self._client: nats.NATS | None = None
        self._js: JetStreamContext | None = None
        self._subscriptions: dict[str, Any] = {}
        self._connected = False
        
    async def connect(self) -> None:
        """Connect to NATS server."""
        config = self.entry.data
        
        # Build connection options
        options = {
            "servers": [f"nats://{config[CONF_HOST]}:{config.get(CONF_PORT, 4222)}"],
            "name": f"HomeAssistant-{self.entry.entry_id[:8]}",
            "reconnect_time_wait": 2,
            "max_reconnect_attempts": -1,  # Infinite
            "error_cb": self._error_callback,
            "disconnected_cb": self._disconnected_callback,
            "reconnected_cb": self._reconnected_callback,
        }
        
        # Add authentication
        if CONF_TOKEN in config:
            options["token"] = config[CONF_TOKEN]
        elif CONF_USERNAME in config:
            options["user"] = config[CONF_USERNAME]
            options["password"] = config.get(CONF_PASSWORD, "")
        
        # Connect
        self._client = await nats.connect(**options)
        self._js = self._client.jetstream()
        self._connected = True
        
        # Fire connection event
        self.hass.bus.async_fire(EVENT_CONNECTION_STATE, {"connected": True})
        
        _LOGGER.info("Connected to NATS server at %s:%s", 
                    config[CONF_HOST], config.get(CONF_PORT, 4222))
    
    async def disconnect(self) -> None:
        """Disconnect from NATS server."""
        if self._client:
            await self._client.drain()
            await self._client.close()
            self._connected = False
            self._client = None
            self._js = None
            
            # Fire connection event
            self.hass.bus.async_fire(EVENT_CONNECTION_STATE, {"connected": False})
    
    async def publish(self, subject: str, payload: str | bytes) -> None:
        """Publish message to NATS."""
        if not self._client:
            raise RuntimeError("NATS client not connected")
        
        if isinstance(payload, str):
            payload = payload.encode()
        
        await self._client.publish(subject, payload)
    
    async def request(self, subject: str, payload: str | bytes, timeout: float = 5.0) -> str:
        """Send request and wait for response."""
        if not self._client:
            raise RuntimeError("NATS client not connected")
        
        if isinstance(payload, str):
            payload = payload.encode()
        
        try:
            response = await self._client.request(subject, payload, timeout=timeout)
            return response.data.decode()
        except TimeoutError:
            _LOGGER.error("Request timeout for subject: %s", subject)
            raise
    
    async def subscribe(self, subject: str, callback) -> str:
        """Subscribe to NATS subject."""
        if not self._client:
            raise RuntimeError("NATS client not connected")
        
        sub = await self._client.subscribe(subject, cb=callback)
        sub_id = f"{subject}_{id(callback)}"
        self._subscriptions[sub_id] = sub
        return sub_id
    
    async def unsubscribe(self, sub_id: str) -> None:
        """Unsubscribe from NATS subject."""
        if sub_id in self._subscriptions:
            sub = self._subscriptions.pop(sub_id)
            await sub.unsubscribe()
    
    @property
    def connected(self) -> bool:
        """Return connection status."""
        return self._connected and self._client is not None and self._client.is_connected
    
    @property
    def jetstream(self) -> JetStreamContext | None:
        """Return JetStream context."""
        return self._js
    
    async def _error_callback(self, err: Exception) -> None:
        """Handle NATS errors."""
        _LOGGER.error("NATS error: %s", err)
    
    async def _disconnected_callback(self) -> None:
        """Handle NATS disconnection."""
        self._connected = False
        self.hass.bus.async_fire(EVENT_CONNECTION_STATE, {"connected": False})
        _LOGGER.warning("Disconnected from NATS server")
    
    async def _reconnected_callback(self) -> None:
        """Handle NATS reconnection."""
        self._connected = True
        self.hass.bus.async_fire(EVENT_CONNECTION_STATE, {"connected": True})
        _LOGGER.info("Reconnected to NATS server")