"""Test NATS Bridge setup and teardown."""
from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import (
    CONF_HOST,
    CONF_PASSWORD,
    CONF_PORT,
    CONF_USERNAME,
)
from homeassistant.core import HomeAssistant

from custom_components.nats_bridge import async_setup_entry, async_unload_entry
from custom_components.nats_bridge.const import (
    CONF_DISCOVERY_PREFIX,
    DOMAIN,
    EVENT_CONNECTION_STATE,
    SERVICE_PUBLISH,
    SERVICE_REQUEST,
    SERVICE_RELOAD,
)


@pytest.fixture
def mock_nats_client():
    """Mock NATS client."""
    client = AsyncMock()
    client.connect = AsyncMock()
    client.disconnect = AsyncMock()
    client.publish = AsyncMock()
    client.subscribe = AsyncMock(return_value="sub_id")
    client.request = AsyncMock(return_value="response")
    client.connected = True
    client.jetstream = AsyncMock()
    return client


@pytest.fixture
def mock_coordinator():
    """Mock coordinator."""
    coordinator = Mock()
    coordinator.async_add_device = Mock()
    coordinator.async_remove_device = Mock()
    coordinator.async_update_device = Mock()
    coordinator.async_subscribe_device = AsyncMock()
    coordinator.get_device = Mock(return_value={"device_id": "test", "online": True})
    coordinator.get_devices_by_type = Mock(return_value=[])
    return coordinator


@pytest.fixture
def mock_discovery():
    """Mock discovery."""
    discovery = AsyncMock()
    discovery.start = AsyncMock()
    discovery.stop = AsyncMock()
    return discovery


@pytest.fixture
def mock_config_entry():
    """Mock config entry."""
    entry = Mock()
    entry.entry_id = "test_entry_id"
    entry.data = {
        CONF_HOST: "localhost",
        CONF_PORT: 4222,
        CONF_USERNAME: "test",
        CONF_PASSWORD: "test",
        CONF_DISCOVERY_PREFIX: "home",
    }
    entry.options = {}
    entry.async_on_unload = Mock()
    return entry


async def test_setup_entry(
    hass: HomeAssistant,
    mock_config_entry,
    mock_nats_client,
    mock_coordinator,
    mock_discovery,
):
    """Test setup of config entry."""
    with patch(
        "custom_components.nats_bridge.NATSClient",
        return_value=mock_nats_client,
    ), patch(
        "custom_components.nats_bridge.NATSCoordinator",
        return_value=mock_coordinator,
    ), patch(
        "custom_components.nats_bridge.NATSDiscovery",
        return_value=mock_discovery,
    ), patch(
        "custom_components.nats_bridge.async_forward_entry_setups",
        return_value=True,
    ):
        assert await async_setup_entry(hass, mock_config_entry)

        # Verify client was connected
        mock_nats_client.connect.assert_called_once()

        # Verify discovery was started
        mock_discovery.start.assert_called_once()

        # Verify data was stored
        assert DOMAIN in hass.data
        assert mock_config_entry.entry_id in hass.data[DOMAIN]
        
        entry_data = hass.data[DOMAIN][mock_config_entry.entry_id]
        assert "client" in entry_data
        assert "coordinator" in entry_data
        assert "discovery" in entry_data


async def test_setup_entry_connection_failed(
    hass: HomeAssistant, mock_config_entry, mock_nats_client
):
    """Test setup when connection fails."""
    mock_nats_client.connect.side_effect = Exception("Connection failed")

    with patch(
        "custom_components.nats_bridge.NATSClient",
        return_value=mock_nats_client,
    ):
        with pytest.raises(Exception):
            await async_setup_entry(hass, mock_config_entry)


async def test_unload_entry(
    hass: HomeAssistant,
    mock_config_entry,
    mock_nats_client,
    mock_coordinator,
    mock_discovery,
):
    """Test unloading of config entry."""
    # Setup entry first
    hass.data[DOMAIN] = {
        mock_config_entry.entry_id: {
            "client": mock_nats_client,
            "coordinator": mock_coordinator,
            "discovery": mock_discovery,
            "devices": {},
            "unsubscribe": [],
        }
    }

    with patch(
        "custom_components.nats_bridge.async_unload_platforms",
        return_value=True,
    ):
        assert await async_unload_entry(hass, mock_config_entry)

        # Verify cleanup
        mock_discovery.stop.assert_called_once()
        mock_nats_client.disconnect.assert_called_once()
        assert mock_config_entry.entry_id not in hass.data[DOMAIN]


async def test_services_registration(hass: HomeAssistant):
    """Test service registration."""
    # Mock entry data
    hass.data[DOMAIN] = {
        "test_entry": {
            "client": AsyncMock(),
        }
    }

    # Register services
    await _register_services(hass)

    # Check services are registered
    assert hass.services.has_service(DOMAIN, SERVICE_PUBLISH)
    assert hass.services.has_service(DOMAIN, SERVICE_REQUEST)
    assert hass.services.has_service(DOMAIN, SERVICE_RELOAD)

    # Test publish service
    client = hass.data[DOMAIN]["test_entry"]["client"]
    await hass.services.async_call(
        DOMAIN,
        SERVICE_PUBLISH,
        {
            "subject": "test.subject",
            "payload": "test payload",
        },
    )
    await hass.async_block_till_done()
    client.publish.assert_called_with("test.subject", "test payload")


async def test_nats_client_wrapper(hass: HomeAssistant, mock_config_entry):
    """Test NATS client wrapper functionality."""
    from custom_components.nats_bridge import NATSClient

    client = NATSClient(hass, mock_config_entry)

    # Test connection
    with patch("nats.connect") as mock_connect:
        mock_nc = AsyncMock()
        mock_nc.jetstream = Mock()
        mock_connect.return_value = mock_nc

        await client.connect()

        assert client._client is not None
        assert client.connected

        # Test publish
        await client.publish("test.subject", "test data")
        mock_nc.publish.assert_called_with("test.subject", b"test data")

        # Test subscribe
        mock_nc.subscribe.return_value = Mock()
        sub_id = await client.subscribe("test.subject", lambda msg: None)
        assert sub_id in client._subscriptions

        # Test disconnect
        await client.disconnect()
        mock_nc.drain.assert_called_once()
        mock_nc.close.assert_called_once()


async def test_connection_callbacks(hass: HomeAssistant, mock_config_entry):
    """Test NATS connection callbacks."""
    from custom_components.nats_bridge import NATSClient

    client = NATSClient(hass, mock_config_entry)

    # Capture event callbacks
    events = []

    def capture_event(event):
        events.append(event)

    hass.bus.async_listen(EVENT_CONNECTION_STATE, capture_event)

    # Test disconnected callback
    await client._disconnected_callback()
    await hass.async_block_till_done()
    
    assert len(events) == 1
    assert events[0].data["connected"] is False

    # Test reconnected callback
    await client._reconnected_callback()
    await hass.async_block_till_done()
    
    assert len(events) == 2
    assert events[1].data["connected"] is True


# Helper function from the actual module
async def _register_services(hass: HomeAssistant) -> None:
    """Register NATS Bridge services."""
    
    async def handle_publish(call):
        """Handle publish service call."""
        for entry_data in hass.data[DOMAIN].values():
            if isinstance(entry_data, dict) and "client" in entry_data:
                client = entry_data["client"]
                await client.publish(call.data["subject"], call.data["payload"])
                return

    async def handle_request(call):
        """Handle request service call."""
        for entry_data in hass.data[DOMAIN].values():
            if isinstance(entry_data, dict) and "client" in entry_data:
                client = entry_data["client"]
                response = await client.request(
                    call.data["subject"],
                    call.data["payload"],
                    call.data.get("timeout", 5)
                )
                return {"response": response}

    async def handle_reload(call):
        """Handle reload service call."""
        pass

    hass.services.async_register(DOMAIN, SERVICE_PUBLISH, handle_publish)
    hass.services.async_register(DOMAIN, SERVICE_REQUEST, handle_request)
    hass.services.async_register(DOMAIN, SERVICE_RELOAD, handle_reload)