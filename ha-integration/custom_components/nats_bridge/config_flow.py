"""Config flow for NATS Bridge integration."""
from __future__ import annotations

import logging
from typing import Any

import nats
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.const import (
    CONF_HOST,
    CONF_NAME,
    CONF_PASSWORD,
    CONF_PORT,
    CONF_TOKEN,
    CONF_USERNAME,
)
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult
from homeassistant.exceptions import HomeAssistantError

from .const import (
    CONF_COMMAND_TIMEOUT,
    CONF_DISCOVERY_PREFIX,
    DEFAULT_COMMAND_TIMEOUT,
    DEFAULT_DISCOVERY_PREFIX,
    DEFAULT_PORT,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)


async def validate_input(hass: HomeAssistant, data: dict[str, Any]) -> dict[str, Any]:
    """Validate the user input allows us to connect."""
    # Build connection options
    options = {
        "servers": [f"nats://{data[CONF_HOST]}:{data.get(CONF_PORT, DEFAULT_PORT)}"],
        "name": "HomeAssistant-ConfigTest",
    }
    
    # Add authentication
    if CONF_TOKEN in data and data[CONF_TOKEN]:
        options["token"] = data[CONF_TOKEN]
    elif CONF_USERNAME in data and data[CONF_USERNAME]:
        options["user"] = data[CONF_USERNAME]
        options["password"] = data.get(CONF_PASSWORD, "")
    
    # Try to connect
    try:
        nc = await nats.connect(**options)
        await nc.close()
    except Exception as err:
        _LOGGER.error("Failed to connect to NATS: %s", err)
        raise CannotConnect from err
    
    # Return info that you want to store in the config entry
    return {"title": data.get(CONF_NAME, f"NATS {data[CONF_HOST]}")}


class ConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for NATS Bridge."""
    
    VERSION = 1
    
    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}
        
        if user_input is not None:
            try:
                info = await validate_input(self.hass, user_input)
            except CannotConnect:
                errors["base"] = "cannot_connect"
            except Exception:  # pylint: disable=broad-except
                _LOGGER.exception("Unexpected exception")
                errors["base"] = "unknown"
            else:
                # Check if already configured
                await self.async_set_unique_id(
                    f"{user_input[CONF_HOST]}:{user_input.get(CONF_PORT, DEFAULT_PORT)}"
                )
                self._abort_if_unique_id_configured()
                
                return self.async_create_entry(title=info["title"], data=user_input)
        
        # Show form
        data_schema = vol.Schema(
            {
                vol.Required(CONF_HOST): str,
                vol.Optional(CONF_PORT, default=DEFAULT_PORT): int,
                vol.Optional(CONF_NAME): str,
                vol.Optional(CONF_DISCOVERY_PREFIX, default=DEFAULT_DISCOVERY_PREFIX): str,
                vol.Optional(CONF_COMMAND_TIMEOUT, default=DEFAULT_COMMAND_TIMEOUT): vol.All(
                    vol.Coerce(float), vol.Range(min=1, max=30)
                ),
            }
        )
        
        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            errors=errors,
            description_placeholders={
                "docs_url": "https://github.com/yourusername/nats-home-automation"
            },
        )
    
    async def async_step_auth(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle authentication step."""
        errors: dict[str, str] = {}
        
        if user_input is not None:
            # Combine with previous data
            data = {**self.context.get("user_data", {}), **user_input}
            
            try:
                info = await validate_input(self.hass, data)
            except CannotConnect:
                errors["base"] = "cannot_connect"
            except Exception:  # pylint: disable=broad-except
                _LOGGER.exception("Unexpected exception")
                errors["base"] = "unknown"
            else:
                # Check if already configured
                await self.async_set_unique_id(
                    f"{data[CONF_HOST]}:{data.get(CONF_PORT, DEFAULT_PORT)}"
                )
                self._abort_if_unique_id_configured()
                
                return self.async_create_entry(title=info["title"], data=data)
        
        # Show authentication form
        data_schema = vol.Schema(
            {
                vol.Exclusive(CONF_TOKEN, "auth"): str,
                vol.Exclusive(CONF_USERNAME, "auth"): str,
                vol.Optional(CONF_PASSWORD): str,
            }
        )
        
        return self.async_show_form(
            step_id="auth",
            data_schema=data_schema,
            errors=errors,
            description_placeholders={
                "host": self.context.get("user_data", {}).get(CONF_HOST, "NATS server")
            },
        )
    
    async def async_step_import(self, import_info: dict[str, Any]) -> FlowResult:
        """Handle import from configuration.yaml."""
        return await self.async_step_user(import_info)


class OptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for NATS Bridge."""
    
    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry
    
    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)
        
        options = self.config_entry.options
        data = self.config_entry.data
        
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        CONF_DISCOVERY_PREFIX,
                        default=options.get(
                            CONF_DISCOVERY_PREFIX,
                            data.get(CONF_DISCOVERY_PREFIX, DEFAULT_DISCOVERY_PREFIX)
                        ),
                    ): str,
                    vol.Optional(
                        CONF_COMMAND_TIMEOUT,
                        default=options.get(
                            CONF_COMMAND_TIMEOUT,
                            data.get(CONF_COMMAND_TIMEOUT, DEFAULT_COMMAND_TIMEOUT)
                        ),
                    ): vol.All(vol.Coerce(float), vol.Range(min=1, max=30)),
                }
            ),
        )


class CannotConnect(HomeAssistantError):
    """Error to indicate we cannot connect."""