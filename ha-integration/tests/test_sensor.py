"""Test NATS Bridge sensor platform."""
from unittest.mock import Mock, patch

import pytest
from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorStateClass,
)
from homeassistant.const import (
    PERCENTAGE,
    UnitOfTemperature,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo

from custom_components.nats_bridge.const import DOMAIN
from custom_components.nats_bridge.sensor import NATSSensor


@pytest.fixture
def mock_coordinator():
    """Mock coordinator."""
    coordinator = Mock()
    coordinator.get_device = Mock()
    coordinator.get_devices_by_type = Mock(return_value=[])
    coordinator.async_add_listener = Mock()
    return coordinator


@pytest.fixture
def mock_client():
    """Mock NATS client."""
    client = Mock()
    client.request = Mock()
    return client


@pytest.fixture
def mock_config_entry():
    """Mock config entry."""
    entry = Mock()
    entry.entry_id = "test_entry"
    entry.data = {"discovery_prefix": "home"}
    return entry


def test_sensor_temperature(mock_coordinator, mock_client, mock_config_entry):
    """Test temperature sensor."""
    device_id = "temp-sensor-01"
    device_data = {
        "device_id": device_id,
        "device_type": "sensor",
        "name": "Test Temperature Sensor",
        "capabilities": {"sensors": ["temperature"]},
        "online": True,
    }

    # Configure coordinator to return device data
    mock_coordinator.get_device.return_value = {
        "device_id": device_id,
        "online": True,
        "state": {
            "data": {
                "temperature": 23.5,
            }
        },
        "health": {
            "rssi": -65,
            "uptime": 3600,
            "free_heap": 45000,
        },
        "last_seen": 1234567890,
    }

    # Create sensor
    sensor = NATSSensor(
        coordinator=mock_coordinator,
        client=mock_client,
        entry=mock_config_entry,
        device_id=device_id,
        device_data=device_data,
        sensor_key="temperature",
        sensor_name="Temperature",
        device_class=SensorDeviceClass.TEMPERATURE,
        unit=UnitOfTemperature.CELSIUS,
        state_class=SensorStateClass.MEASUREMENT,
    )

    # Test attributes
    assert sensor.unique_id == f"{device_id}_temperature"
    assert sensor.name == "Temperature"
    assert sensor.device_class == SensorDeviceClass.TEMPERATURE
    assert sensor.native_unit_of_measurement == UnitOfTemperature.CELSIUS
    assert sensor.state_class == SensorStateClass.MEASUREMENT

    # Test state
    assert sensor.native_value == 23.5
    assert sensor.available is True

    # Test extra attributes
    attrs = sensor.extra_state_attributes
    assert attrs["device_id"] == device_id
    assert attrs["rssi"] == -65
    assert attrs["uptime"] == 3600
    assert attrs["free_heap"] == 45000

    # Test device info
    device_info = sensor.device_info
    assert device_info["identifiers"] == {(DOMAIN, device_id)}
    assert device_info["name"] == "Test Temperature Sensor"


def test_sensor_humidity(mock_coordinator, mock_client, mock_config_entry):
    """Test humidity sensor."""
    device_id = "humidity-sensor-01"
    
    mock_coordinator.get_device.return_value = {
        "device_id": device_id,
        "online": True,
        "state": {
            "data": {
                "humidity": 65.2,
            }
        },
    }

    sensor = NATSSensor(
        coordinator=mock_coordinator,
        client=mock_client,
        entry=mock_config_entry,
        device_id=device_id,
        device_data={"name": "Test Humidity"},
        sensor_key="humidity",
        sensor_name="Humidity",
        device_class=SensorDeviceClass.HUMIDITY,
        unit=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
    )

    assert sensor.native_value == 65.2
    assert sensor.native_unit_of_measurement == PERCENTAGE


def test_sensor_unavailable(mock_coordinator, mock_client, mock_config_entry):
    """Test sensor when device is unavailable."""
    device_id = "offline-sensor"
    
    # Device is offline
    mock_coordinator.get_device.return_value = {
        "device_id": device_id,
        "online": False,
    }

    sensor = NATSSensor(
        coordinator=mock_coordinator,
        client=mock_client,
        entry=mock_config_entry,
        device_id=device_id,
        device_data={},
        sensor_key="temperature",
        sensor_name="Temperature",
        device_class=None,
        unit=None,
        state_class=None,
    )

    assert sensor.available is False
    assert sensor.native_value is None


def test_sensor_no_device(mock_coordinator, mock_client, mock_config_entry):
    """Test sensor when device doesn't exist."""
    device_id = "nonexistent"
    
    # Device doesn't exist
    mock_coordinator.get_device.return_value = None

    sensor = NATSSensor(
        coordinator=mock_coordinator,
        client=mock_client,
        entry=mock_config_entry,
        device_id=device_id,
        device_data={},
        sensor_key="temperature",
        sensor_name="Temperature",
        device_class=None,
        unit=None,
        state_class=None,
    )

    assert sensor.available is False
    assert sensor.native_value is None


async def test_sensor_request_refresh(mock_coordinator, mock_client, mock_config_entry):
    """Test sensor refresh request."""
    device_id = "refresh-sensor"
    
    sensor = NATSSensor(
        coordinator=mock_coordinator,
        client=mock_client,
        entry=mock_config_entry,
        device_id=device_id,
        device_data={},
        sensor_key="temperature",
        sensor_name="Temperature",
        device_class=None,
        unit=None,
        state_class=None,
    )

    # Mock successful request
    mock_client.request.return_value = None

    await sensor.async_request_refresh()

    # Verify request was made
    mock_client.request.assert_called_once()
    call_args = mock_client.request.call_args
    assert call_args[0][0] == "home.devices.sensor.refresh-sensor.command"
    assert '"action": "read"' in call_args[0][1]


async def test_sensor_setup_entry(hass: HomeAssistant):
    """Test sensor platform setup."""
    from custom_components.nats_bridge import sensor

    mock_entry = Mock()
    mock_entry.entry_id = "test_entry"
    
    mock_coordinator = Mock()
    mock_coordinator.get_devices_by_type.return_value = []
    
    mock_client = Mock()

    hass.data[DOMAIN] = {
        mock_entry.entry_id: {
            "coordinator": mock_coordinator,
            "client": mock_client,
        }
    }

    entities_added = []

    async def mock_add_entities(entities):
        entities_added.extend(entities)

    # Setup platform
    await sensor.async_setup_entry(hass, mock_entry, mock_add_entities)

    # Verify no entities added initially (no devices)
    assert len(entities_added) == 0

    # Test discovery callback
    device_data = {
        "device_id": "new-sensor",
        "capabilities": {
            "sensors": ["temperature", "humidity", "pressure"]
        },
    }

    # Get the discovery callback
    mock_entry.async_on_unload.assert_called_once()
    
    # Simulate device discovery
    # Would trigger the callback to create 3 sensor entities
    # assert len(entities_added) == 3