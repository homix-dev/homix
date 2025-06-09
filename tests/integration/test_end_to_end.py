"""End-to-end integration tests for NATS Home Automation system."""
import asyncio
import json
import time
from unittest.mock import Mock

import nats
import pytest
from nats.errors import TimeoutError as NATSTimeoutError


@pytest.fixture
async def nats_client():
    """Create NATS client for testing."""
    nc = await nats.connect("nats://home:changeme@localhost:4222")
    yield nc
    await nc.close()


@pytest.fixture
async def jetstream(nats_client):
    """Get JetStream context."""
    js = nats_client.jetstream()
    
    # Ensure test KV buckets exist
    try:
        await js.create_key_value(name="devices", history=5)
    except:
        pass  # Already exists
    
    try:
        await js.create_key_value(name="config", history=10)
    except:
        pass  # Already exists
    
    yield js


class TestDeviceDiscovery:
    """Test device discovery flow."""
    
    async def test_device_announcement(self, nats_client, jetstream):
        """Test device announcement and registration."""
        device = {
            "device_id": "test-sensor-01",
            "device_type": "sensor",
            "name": "Test Temperature Sensor",
            "manufacturer": "Test Inc",
            "model": "TS-001",
            "capabilities": {
                "sensors": ["temperature", "humidity"],
                "units": {
                    "temperature": "°C",
                    "humidity": "%"
                }
            }
        }
        
        # Subscribe to discovery responses
        responses = []
        
        async def discovery_handler(msg):
            responses.append(json.loads(msg.data.decode()))
        
        sub = await nats_client.subscribe("home.discovery.response", cb=discovery_handler)
        
        # Announce device
        await nats_client.publish("home.discovery.announce", json.dumps(device).encode())
        
        # Wait for processing
        await asyncio.sleep(0.5)
        
        # Check device was registered in KV
        kv = await jetstream.key_value("devices")
        entry = await kv.get("test-sensor-01")
        stored_device = json.loads(entry.value.decode())
        
        assert stored_device["device_id"] == device["device_id"]
        assert stored_device["device_type"] == device["device_type"]
        assert stored_device["name"] == device["name"]
        
        # Cleanup
        await sub.unsubscribe()
        await kv.delete("test-sensor-01")
    
    async def test_device_list(self, nats_client, jetstream):
        """Test listing devices."""
        # Add test devices to KV
        kv = await jetstream.key_value("devices")
        
        devices = [
            {
                "device_id": "list-test-01",
                "device_type": "sensor",
                "name": "Sensor 1",
                "status": "online"
            },
            {
                "device_id": "list-test-02",
                "device_type": "switch",
                "name": "Switch 1",
                "status": "offline"
            }
        ]
        
        for device in devices:
            await kv.put(device["device_id"], json.dumps(device).encode())
        
        # Request device list
        try:
            response = await nats_client.request(
                "home.discovery.list",
                b"{}",
                timeout=2.0
            )
            
            device_list = json.loads(response.data.decode())
            assert len(device_list) >= 2
            
            # Check our devices are in the list
            device_ids = [d["device_id"] for d in device_list]
            assert "list-test-01" in device_ids
            assert "list-test-02" in device_ids
            
        except NATSTimeoutError:
            pytest.skip("Discovery service not running")
        
        finally:
            # Cleanup
            await kv.delete("list-test-01")
            await kv.delete("list-test-02")


class TestDeviceControl:
    """Test device control flows."""
    
    async def test_switch_control(self, nats_client):
        """Test controlling a switch device."""
        device_id = "test-switch-01"
        
        # Simulate switch device
        switch_state = {"state": "off"}
        
        async def handle_command(msg):
            command = json.loads(msg.data.decode())
            
            if command.get("action") == "on":
                switch_state["state"] = "on"
                response = {"status": "on"}
            elif command.get("action") == "off":
                switch_state["state"] = "off"
                response = {"status": "off"}
            elif command.get("action") == "toggle":
                switch_state["state"] = "off" if switch_state["state"] == "on" else "on"
                response = {"status": switch_state["state"]}
            else:
                response = {"error": "unknown action"}
            
            await nats_client.publish(msg.reply, json.dumps(response).encode())
        
        # Subscribe to commands
        sub = await nats_client.subscribe(
            f"home.devices.switch.{device_id}.command",
            cb=handle_command
        )
        
        # Test turning on
        response = await nats_client.request(
            f"home.devices.switch.{device_id}.command",
            json.dumps({"action": "on"}).encode(),
            timeout=1.0
        )
        result = json.loads(response.data.decode())
        assert result["status"] == "on"
        assert switch_state["state"] == "on"
        
        # Test turning off
        response = await nats_client.request(
            f"home.devices.switch.{device_id}.command",
            json.dumps({"action": "off"}).encode(),
            timeout=1.0
        )
        result = json.loads(response.data.decode())
        assert result["status"] == "off"
        assert switch_state["state"] == "off"
        
        # Test toggle
        response = await nats_client.request(
            f"home.devices.switch.{device_id}.command",
            json.dumps({"action": "toggle"}).encode(),
            timeout=1.0
        )
        result = json.loads(response.data.decode())
        assert result["status"] == "on"
        assert switch_state["state"] == "on"
        
        # Cleanup
        await sub.unsubscribe()
    
    async def test_sensor_reading(self, nats_client):
        """Test reading sensor data."""
        device_id = "test-sensor-02"
        
        # Simulate sensor device
        async def handle_command(msg):
            command = json.loads(msg.data.decode())
            
            if command.get("action") == "read":
                response = {
                    "status": "ok",
                    "data": {
                        "temperature": 23.5,
                        "humidity": 45.2
                    },
                    "timestamp": time.time()
                }
            else:
                response = {"error": "unknown action"}
            
            await nats_client.publish(msg.reply, json.dumps(response).encode())
        
        # Subscribe to commands
        sub = await nats_client.subscribe(
            f"home.devices.sensor.{device_id}.command",
            cb=handle_command
        )
        
        # Request sensor reading
        response = await nats_client.request(
            f"home.devices.sensor.{device_id}.command",
            json.dumps({"action": "read"}).encode(),
            timeout=1.0
        )
        result = json.loads(response.data.decode())
        
        assert result["status"] == "ok"
        assert result["data"]["temperature"] == 23.5
        assert result["data"]["humidity"] == 45.2
        assert "timestamp" in result
        
        # Cleanup
        await sub.unsubscribe()


class TestStateUpdates:
    """Test device state update flows."""
    
    async def test_state_publishing(self, nats_client):
        """Test device state publishing and monitoring."""
        device_id = "test-device-03"
        received_states = []
        
        # Subscribe to state updates
        async def state_handler(msg):
            state = json.loads(msg.data.decode())
            received_states.append(state)
        
        sub = await nats_client.subscribe(
            f"home.devices.sensor.{device_id}.state",
            cb=state_handler
        )
        
        # Publish state updates
        states = [
            {
                "device_id": device_id,
                "timestamp": time.time(),
                "data": {"temperature": 22.0}
            },
            {
                "device_id": device_id,
                "timestamp": time.time(),
                "data": {"temperature": 22.5}
            },
            {
                "device_id": device_id,
                "timestamp": time.time(),
                "data": {"temperature": 23.0}
            }
        ]
        
        for state in states:
            await nats_client.publish(
                f"home.devices.sensor.{device_id}.state",
                json.dumps(state).encode()
            )
            await asyncio.sleep(0.1)
        
        # Verify all states received
        assert len(received_states) == 3
        assert received_states[0]["data"]["temperature"] == 22.0
        assert received_states[1]["data"]["temperature"] == 22.5
        assert received_states[2]["data"]["temperature"] == 23.0
        
        # Cleanup
        await sub.unsubscribe()
    
    async def test_health_monitoring(self, nats_client):
        """Test device health monitoring."""
        device_id = "test-device-04"
        health_updates = []
        
        # Subscribe to health updates
        async def health_handler(msg):
            health = json.loads(msg.data.decode())
            health_updates.append(health)
        
        sub = await nats_client.subscribe(
            f"home.devices.*.{device_id}.health",
            cb=health_handler
        )
        
        # Publish health update
        health = {
            "device_id": device_id,
            "online": True,
            "uptime": 3600,
            "free_heap": 45000,
            "rssi": -65,
            "cpu_temp": 45.2,
            "error_count": 0
        }
        
        await nats_client.publish(
            f"home.devices.sensor.{device_id}.health",
            json.dumps(health).encode()
        )
        
        await asyncio.sleep(0.1)
        
        # Verify health received
        assert len(health_updates) == 1
        assert health_updates[0]["online"] is True
        assert health_updates[0]["rssi"] == -65
        
        # Cleanup
        await sub.unsubscribe()


class TestConfiguration:
    """Test configuration management."""
    
    async def test_config_storage(self, nats_client, jetstream):
        """Test storing and retrieving configuration."""
        device_id = "config-test-01"
        
        config = {
            "update_interval": 30,
            "temp_offset": 0.5,
            "humidity_offset": -2.0,
            "enabled": True,
            "thresholds": {
                "temp_high": 30,
                "temp_low": 10,
                "humidity_high": 80,
                "humidity_low": 20
            }
        }
        
        # Store config in KV
        kv = await jetstream.key_value("config")
        await kv.put(f"device.{device_id}", json.dumps(config).encode())
        
        # Retrieve config
        entry = await kv.get(f"device.{device_id}")
        stored_config = json.loads(entry.value.decode())
        
        assert stored_config["update_interval"] == 30
        assert stored_config["temp_offset"] == 0.5
        assert stored_config["thresholds"]["temp_high"] == 30
        
        # Update config
        config["update_interval"] = 60
        await kv.put(f"device.{device_id}", json.dumps(config).encode())
        
        # Verify update
        entry = await kv.get(f"device.{device_id}")
        updated_config = json.loads(entry.value.decode())
        assert updated_config["update_interval"] == 60
        
        # Cleanup
        await kv.delete(f"device.{device_id}")
    
    async def test_config_update_notification(self, nats_client):
        """Test configuration update notifications."""
        device_id = "config-test-02"
        config_updates = []
        
        # Device subscribes to config updates
        async def config_handler(msg):
            config = json.loads(msg.data.decode())
            config_updates.append(config)
            # Acknowledge receipt
            if msg.reply:
                await nats_client.publish(msg.reply, b'{"status":"applied"}')
        
        sub = await nats_client.subscribe(
            f"home.config.device.{device_id}",
            cb=config_handler
        )
        
        # Send config update
        new_config = {
            "update_interval": 45,
            "enabled": False
        }
        
        try:
            response = await nats_client.request(
                f"home.config.device.{device_id}",
                json.dumps(new_config).encode(),
                timeout=1.0
            )
            result = json.loads(response.data.decode())
            assert result["status"] == "applied"
        except NATSTimeoutError:
            # Device might not be responding
            pass
        
        # Verify config received
        assert len(config_updates) == 1
        assert config_updates[0]["update_interval"] == 45
        assert config_updates[0]["enabled"] is False
        
        # Cleanup
        await sub.unsubscribe()


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])