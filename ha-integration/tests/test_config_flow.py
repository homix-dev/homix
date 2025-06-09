"""Test the NATS Bridge config flow."""
from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant import config_entries
from homeassistant.const import (
    CONF_HOST,
    CONF_NAME,
    CONF_PASSWORD,
    CONF_PORT,
    CONF_TOKEN,
    CONF_USERNAME,
)

from custom_components.nats_bridge import config_flow
from custom_components.nats_bridge.const import (
    CONF_COMMAND_TIMEOUT,
    CONF_DISCOVERY_PREFIX,
    DEFAULT_COMMAND_TIMEOUT,
    DEFAULT_DISCOVERY_PREFIX,
    DEFAULT_PORT,
    DOMAIN,
)


@pytest.fixture
def mock_nats_connect():
    """Mock NATS connection."""
    with patch("nats.connect") as mock:
        mock_conn = AsyncMock()
        mock_conn.close = AsyncMock()
        mock.return_value = mock_conn
        yield mock


async def test_form_user(hass, mock_nats_connect):
    """Test we get the form."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] == "form"
    assert result["errors"] == {}

    # Test successful connection
    result2 = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            CONF_HOST: "localhost",
            CONF_PORT: 4222,
            CONF_NAME: "Test NATS",
            CONF_DISCOVERY_PREFIX: "home",
            CONF_COMMAND_TIMEOUT: 5,
        },
    )
    await hass.async_block_till_done()

    assert result2["type"] == "create_entry"
    assert result2["title"] == "Test NATS"
    assert result2["data"] == {
        CONF_HOST: "localhost",
        CONF_PORT: 4222,
        CONF_NAME: "Test NATS",
        CONF_DISCOVERY_PREFIX: "home",
        CONF_COMMAND_TIMEOUT: 5,
    }
    assert len(mock_nats_connect.mock_calls) == 1


async def test_form_cannot_connect(hass):
    """Test we handle cannot connect error."""
    with patch("nats.connect", side_effect=Exception("Connection failed")):
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": config_entries.SOURCE_USER}
        )

        result2 = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {
                CONF_HOST: "localhost",
                CONF_PORT: 4222,
            },
        )

        assert result2["type"] == "form"
        assert result2["errors"] == {"base": "cannot_connect"}


async def test_form_with_auth(hass, mock_nats_connect):
    """Test form with authentication."""
    # Start config flow
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )

    # Configure server details
    result2 = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            CONF_HOST: "localhost",
            CONF_PORT: 4222,
            CONF_NAME: "Test NATS Auth",
        },
    )
    
    # Should go to auth step
    assert result2["type"] == "form"
    assert result2["step_id"] == "auth"

    # Configure authentication
    result3 = await hass.config_entries.flow.async_configure(
        result2["flow_id"],
        {
            CONF_USERNAME: "testuser",
            CONF_PASSWORD: "testpass",
        },
    )

    assert result3["type"] == "create_entry"
    assert result3["title"] == "Test NATS Auth"
    assert result3["data"][CONF_USERNAME] == "testuser"
    assert result3["data"][CONF_PASSWORD] == "testpass"


async def test_form_with_token_auth(hass, mock_nats_connect):
    """Test form with token authentication."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )

    result2 = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            CONF_HOST: "localhost",
            CONF_PORT: 4222,
        },
    )

    result3 = await hass.config_entries.flow.async_configure(
        result2["flow_id"],
        {
            CONF_TOKEN: "test-token-123",
        },
    )

    assert result3["type"] == "create_entry"
    assert result3["data"][CONF_TOKEN] == "test-token-123"


async def test_form_already_configured(hass, mock_nats_connect):
    """Test we abort if already configured."""
    # Create an existing entry
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id="localhost:4222",
        data={
            CONF_HOST: "localhost",
            CONF_PORT: 4222,
        },
    )
    entry.add_to_hass(hass)

    # Try to configure the same server
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )

    result2 = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            CONF_HOST: "localhost",
            CONF_PORT: 4222,
        },
    )

    assert result2["type"] == "abort"
    assert result2["reason"] == "already_configured"


async def test_options_flow(hass):
    """Test options flow."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={
            CONF_HOST: "localhost",
            CONF_PORT: 4222,
            CONF_DISCOVERY_PREFIX: "home",
            CONF_COMMAND_TIMEOUT: 5,
        },
    )
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)

    assert result["type"] == "form"
    assert result["step_id"] == "init"

    result2 = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            CONF_DISCOVERY_PREFIX: "custom",
            CONF_COMMAND_TIMEOUT: 10,
        },
    )

    assert result2["type"] == "create_entry"
    assert result2["data"] == {
        CONF_DISCOVERY_PREFIX: "custom",
        CONF_COMMAND_TIMEOUT: 10,
    }


async def test_import_flow(hass, mock_nats_connect):
    """Test import from configuration.yaml."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": config_entries.SOURCE_IMPORT},
        data={
            CONF_HOST: "imported-host",
            CONF_PORT: 4223,
            CONF_USERNAME: "imported-user",
            CONF_PASSWORD: "imported-pass",
        },
    )

    assert result["type"] == "create_entry"
    assert result["title"] == "NATS imported-host"
    assert result["data"] == {
        CONF_HOST: "imported-host",
        CONF_PORT: 4223,
        CONF_USERNAME: "imported-user",
        CONF_PASSWORD: "imported-pass",
    }


class MockConfigEntry:
    """Mock config entry."""

    def __init__(self, **kwargs):
        """Initialize mock entry."""
        self.entry_id = "test_entry_id"
        self.domain = kwargs.get("domain")
        self.data = kwargs.get("data", {})
        self.options = kwargs.get("options", {})
        self.unique_id = kwargs.get("unique_id")

    def add_to_hass(self, hass):
        """Add entry to hass."""
        if not hasattr(hass.config_entries, "_entries"):
            hass.config_entries._entries = []
        hass.config_entries._entries.append(self)