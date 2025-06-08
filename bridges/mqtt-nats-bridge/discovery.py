"""Home Assistant discovery handler."""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from asyncio_mqtt import Client as MQTTClient
import nats

from .config import Config

logger = logging.getLogger(__name__)


class DiscoveryHandler:
    """Handle Home Assistant MQTT discovery and NATS device announcements."""
    
    def __init__(self, config: Config):
        self.config = config
        self.mqtt_client: Optional[MQTTClient] = None
        self.nats_client: Optional[nats.NATS] = None
        
        # Track discovered devices
        self.devices: Dict[str, Dict[str, Any]] = {}
        
        # Component type mapping
        self.component_map = {
            "sensor": self._create_sensor_config,
            "binary_sensor": self._create_binary_sensor_config,
            "switch": self._create_switch_config,
            "light": self._create_light_config,
            "climate": self._create_climate_config,
            "cover": self._create_cover_config,
            "fan": self._create_fan_config,
            "lock": self._create_lock_config,
        }
    
    async def start(self, mqtt_client: MQTTClient, nats_client: nats.NATS):
        """Start discovery handler."""
        self.mqtt_client = mqtt_client
        self.nats_client = nats_client
        logger.info("Discovery handler started")
    
    async def stop(self):
        """Stop discovery handler."""
        logger.info("Discovery handler stopped")
    
    async def handle_mqtt_discovery(self, topic: str, payload: str):
        """Handle MQTT discovery message."""
        try:
            # Parse discovery topic
            # Format: homeassistant/component/node_id/object_id/config
            parts = topic.split('/')
            if len(parts) < 5 or parts[-1] != "config":
                return
            
            prefix = parts[0]
            component = parts[1]
            node_id = parts[2]
            object_id = parts[3]
            
            if not payload:
                # Empty payload means remove device
                device_key = f"{node_id}_{object_id}"
                if device_key in self.devices:
                    del self.devices[device_key]
                    logger.info(f"Removed device from discovery: {device_key}")
                return
            
            # Parse configuration
            config = json.loads(payload)
            
            # Store device info
            device_key = f"{node_id}_{object_id}"
            self.devices[device_key] = {
                "component": component,
                "node_id": node_id,
                "object_id": object_id,
                "config": config,
                "discovered_at": datetime.utcnow().isoformat()
            }
            
            # Create NATS announcement
            await self._announce_to_nats(node_id, component, object_id, config)
            
            logger.info(f"Discovered MQTT device: {device_key} ({component})")
            
        except Exception as e:
            logger.error(f"Error handling MQTT discovery: {e}", exc_info=True)
    
    async def handle_nats_discovery(self, subject: str, data: Dict[str, Any]):
        """Handle NATS device announcement."""
        try:
            # Extract device info
            device_id = data.get("device_id")
            device_type = data.get("device_type")
            device_name = data.get("device_name", device_id)
            capabilities = data.get("capabilities", [])
            
            if not device_id or not device_type:
                logger.warning("Invalid NATS discovery message: missing device_id or device_type")
                return
            
            logger.info(f"Discovered NATS device: {device_id} ({device_type})")
            
            # Create Home Assistant discovery configs for each capability
            for capability in capabilities:
                await self._create_ha_discovery(device_id, device_type, capability, data)
            
            # Store device info
            self.devices[device_id] = {
                "source": "nats",
                "device_id": device_id,
                "device_type": device_type,
                "device_name": device_name,
                "capabilities": capabilities,
                "data": data,
                "discovered_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error handling NATS discovery: {e}", exc_info=True)
    
    async def _announce_to_nats(self, node_id: str, component: str, object_id: str, config: Dict[str, Any]):
        """Announce MQTT device to NATS."""
        announcement = {
            "device_id": node_id,
            "device_type": component,
            "device_name": config.get("name", f"{node_id}_{object_id}"),
            "manufacturer": "Home Assistant",
            "model": component,
            "capabilities": [object_id],
            "mqtt_config": config,
            "source": "mqtt_bridge",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Add device info if present
        if "device" in config:
            announcement.update({
                "manufacturer": config["device"].get("manufacturer", "Home Assistant"),
                "model": config["device"].get("model", component),
                "sw_version": config["device"].get("sw_version"),
            })
        
        # Publish to NATS discovery
        await self.nats_client.publish(
            "home.discovery.announce",
            json.dumps(announcement).encode('utf-8')
        )
    
    async def _create_ha_discovery(self, device_id: str, device_type: str, capability: str, device_data: Dict[str, Any]):
        """Create Home Assistant discovery message for NATS device."""
        # Determine component type based on capability name
        component = self._determine_component_type(capability, device_type)
        
        # Get config creator for component
        config_creator = self.component_map.get(component)
        if not config_creator:
            logger.warning(f"Unknown component type: {component}")
            return
        
        # Create discovery config
        config = config_creator(device_id, capability, device_data)
        
        # Publish discovery message
        topic = f"{self.config.bridge.discovery_prefix}/{component}/{device_id}_{capability}/config"
        
        await self.mqtt_client.publish(
            topic,
            json.dumps(config).encode('utf-8'),
            qos=1,
            retain=True
        )
        
        logger.debug(f"Published HA discovery for {device_id}/{capability} as {component}")
    
    def _determine_component_type(self, capability: str, device_type: str) -> str:
        """Determine HA component type from capability."""
        # Check capability name patterns
        capability_lower = capability.lower()
        
        if any(word in capability_lower for word in ["temp", "humidity", "pressure", "power", "energy", "voltage", "current"]):
            return "sensor"
        elif any(word in capability_lower for word in ["motion", "door", "window", "occupancy", "presence"]):
            return "binary_sensor"
        elif any(word in capability_lower for word in ["relay", "switch", "outlet"]):
            return "switch"
        elif any(word in capability_lower for word in ["light", "lamp", "bulb"]):
            return "light"
        elif any(word in capability_lower for word in ["climate", "thermostat", "hvac"]):
            return "climate"
        elif any(word in capability_lower for word in ["cover", "shade", "blind", "curtain"]):
            return "cover"
        elif any(word in capability_lower for word in ["fan"]):
            return "fan"
        elif any(word in capability_lower for word in ["lock"]):
            return "lock"
        
        # Fall back to device type
        return self.config.device_type_map.get(device_type, "sensor")
    
    def _create_sensor_config(self, device_id: str, capability: str, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create sensor discovery config."""
        config = {
            "name": f"{device_data.get('device_name', device_id)} {capability.replace('_', ' ').title()}",
            "unique_id": f"{device_id}_{capability}",
            "state_topic": f"homeassistant/sensor/{device_id}/state",
            "value_template": f"{{{{ value_json.{capability} }}}}",
            "device": {
                "identifiers": [device_id],
                "name": device_data.get("device_name", device_id),
                "model": device_data.get("model", "NATS Device"),
                "manufacturer": device_data.get("manufacturer", "NATS"),
                "sw_version": device_data.get("firmware_version"),
            }
        }
        
        # Add unit and device class based on capability
        if "temp" in capability.lower():
            config["unit_of_measurement"] = "°C"
            config["device_class"] = "temperature"
        elif "humidity" in capability.lower():
            config["unit_of_measurement"] = "%"
            config["device_class"] = "humidity"
        elif "pressure" in capability.lower():
            config["unit_of_measurement"] = "hPa"
            config["device_class"] = "pressure"
        elif "power" in capability.lower():
            config["unit_of_measurement"] = "W"
            config["device_class"] = "power"
        elif "energy" in capability.lower():
            config["unit_of_measurement"] = "kWh"
            config["device_class"] = "energy"
        elif "voltage" in capability.lower():
            config["unit_of_measurement"] = "V"
            config["device_class"] = "voltage"
        elif "current" in capability.lower():
            config["unit_of_measurement"] = "A"
            config["device_class"] = "current"
        elif "rssi" in capability.lower() or "signal" in capability.lower():
            config["unit_of_measurement"] = "dBm"
            config["device_class"] = "signal_strength"
        
        return config
    
    def _create_binary_sensor_config(self, device_id: str, capability: str, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create binary sensor discovery config."""
        config = {
            "name": f"{device_data.get('device_name', device_id)} {capability.replace('_', ' ').title()}",
            "unique_id": f"{device_id}_{capability}",
            "state_topic": f"homeassistant/binary_sensor/{device_id}/state",
            "value_template": f"{{{{ 'ON' if value_json.{capability} else 'OFF' }}}}",
            "device": {
                "identifiers": [device_id],
                "name": device_data.get("device_name", device_id),
                "model": device_data.get("model", "NATS Device"),
                "manufacturer": device_data.get("manufacturer", "NATS"),
                "sw_version": device_data.get("firmware_version"),
            }
        }
        
        # Add device class based on capability
        if "motion" in capability.lower():
            config["device_class"] = "motion"
        elif "door" in capability.lower():
            config["device_class"] = "door"
        elif "window" in capability.lower():
            config["device_class"] = "window"
        elif "occupancy" in capability.lower():
            config["device_class"] = "occupancy"
        elif "presence" in capability.lower():
            config["device_class"] = "presence"
        
        return config
    
    def _create_switch_config(self, device_id: str, capability: str, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create switch discovery config."""
        return {
            "name": f"{device_data.get('device_name', device_id)} {capability.replace('_', ' ').title()}",
            "unique_id": f"{device_id}_{capability}",
            "state_topic": f"homeassistant/switch/{device_id}/state",
            "command_topic": f"homeassistant/switch/{device_id}/{capability}/set",
            "value_template": f"{{{{ 'ON' if value_json.{capability} else 'OFF' }}}}",
            "payload_on": "ON",
            "payload_off": "OFF",
            "device": {
                "identifiers": [device_id],
                "name": device_data.get("device_name", device_id),
                "model": device_data.get("model", "NATS Device"),
                "manufacturer": device_data.get("manufacturer", "NATS"),
                "sw_version": device_data.get("firmware_version"),
            }
        }
    
    def _create_light_config(self, device_id: str, capability: str, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create light discovery config."""
        return {
            "name": f"{device_data.get('device_name', device_id)} {capability.replace('_', ' ').title()}",
            "unique_id": f"{device_id}_{capability}",
            "state_topic": f"homeassistant/light/{device_id}/state",
            "command_topic": f"homeassistant/light/{device_id}/{capability}/set",
            "brightness_state_topic": f"homeassistant/light/{device_id}/brightness",
            "brightness_command_topic": f"homeassistant/light/{device_id}/{capability}/brightness/set",
            "value_template": f"{{{{ 'ON' if value_json.{capability} else 'OFF' }}}}",
            "brightness_value_template": "{{ value_json.brightness }}",
            "payload_on": "ON",
            "payload_off": "OFF",
            "device": {
                "identifiers": [device_id],
                "name": device_data.get("device_name", device_id),
                "model": device_data.get("model", "NATS Device"),
                "manufacturer": device_data.get("manufacturer", "NATS"),
                "sw_version": device_data.get("firmware_version"),
            }
        }
    
    def _create_climate_config(self, device_id: str, capability: str, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create climate discovery config."""
        return {
            "name": f"{device_data.get('device_name', device_id)} Climate",
            "unique_id": f"{device_id}_climate",
            "mode_state_topic": f"homeassistant/climate/{device_id}/mode",
            "mode_command_topic": f"homeassistant/climate/{device_id}/mode/set",
            "temperature_state_topic": f"homeassistant/climate/{device_id}/temp",
            "temperature_command_topic": f"homeassistant/climate/{device_id}/temp/set",
            "current_temperature_topic": f"homeassistant/climate/{device_id}/current_temp",
            "modes": ["off", "heat", "cool", "auto"],
            "device": {
                "identifiers": [device_id],
                "name": device_data.get("device_name", device_id),
                "model": device_data.get("model", "NATS Device"),
                "manufacturer": device_data.get("manufacturer", "NATS"),
                "sw_version": device_data.get("firmware_version"),
            }
        }
    
    def _create_cover_config(self, device_id: str, capability: str, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create cover discovery config."""
        return {
            "name": f"{device_data.get('device_name', device_id)} {capability.replace('_', ' ').title()}",
            "unique_id": f"{device_id}_{capability}",
            "state_topic": f"homeassistant/cover/{device_id}/state",
            "command_topic": f"homeassistant/cover/{device_id}/{capability}/set",
            "position_topic": f"homeassistant/cover/{device_id}/position",
            "set_position_topic": f"homeassistant/cover/{device_id}/{capability}/position/set",
            "payload_open": "OPEN",
            "payload_close": "CLOSE",
            "payload_stop": "STOP",
            "device": {
                "identifiers": [device_id],
                "name": device_data.get("device_name", device_id),
                "model": device_data.get("model", "NATS Device"),
                "manufacturer": device_data.get("manufacturer", "NATS"),
                "sw_version": device_data.get("firmware_version"),
            }
        }
    
    def _create_fan_config(self, device_id: str, capability: str, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create fan discovery config."""
        return {
            "name": f"{device_data.get('device_name', device_id)} {capability.replace('_', ' ').title()}",
            "unique_id": f"{device_id}_{capability}",
            "state_topic": f"homeassistant/fan/{device_id}/state",
            "command_topic": f"homeassistant/fan/{device_id}/{capability}/set",
            "speed_state_topic": f"homeassistant/fan/{device_id}/speed",
            "speed_command_topic": f"homeassistant/fan/{device_id}/{capability}/speed/set",
            "speeds": ["low", "medium", "high"],
            "payload_on": "ON",
            "payload_off": "OFF",
            "device": {
                "identifiers": [device_id],
                "name": device_data.get("device_name", device_id),
                "model": device_data.get("model", "NATS Device"),
                "manufacturer": device_data.get("manufacturer", "NATS"),
                "sw_version": device_data.get("firmware_version"),
            }
        }
    
    def _create_lock_config(self, device_id: str, capability: str, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create lock discovery config."""
        return {
            "name": f"{device_data.get('device_name', device_id)} {capability.replace('_', ' ').title()}",
            "unique_id": f"{device_id}_{capability}",
            "state_topic": f"homeassistant/lock/{device_id}/state",
            "command_topic": f"homeassistant/lock/{device_id}/{capability}/set",
            "payload_lock": "LOCK",
            "payload_unlock": "UNLOCK",
            "state_locked": "LOCKED",
            "state_unlocked": "UNLOCKED",
            "device": {
                "identifiers": [device_id],
                "name": device_data.get("device_name", device_id),
                "model": device_data.get("model", "NATS Device"),
                "manufacturer": device_data.get("manufacturer", "NATS"),
                "sw_version": device_data.get("firmware_version"),
            }
        }