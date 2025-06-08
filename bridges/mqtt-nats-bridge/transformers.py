"""Message transformation utilities."""

import json
import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime
import re

logger = logging.getLogger(__name__)


class MessageTransformer:
    """Transform messages between MQTT and NATS formats."""
    
    def __init__(self):
        # Custom transformers can be registered
        self.mqtt_to_nats_transformers: Dict[str, Callable] = {}
        self.nats_to_mqtt_transformers: Dict[str, Callable] = {}
        
        # Register default transformers
        self._register_default_transformers()
    
    def _register_default_transformers(self):
        """Register default message transformers."""
        # MQTT to NATS transformers
        self.register_mqtt_to_nats("homeassistant/+/+/+/set", self._transform_ha_command)
        self.register_mqtt_to_nats("homeassistant/+/+/+/state", self._transform_ha_state)
        
        # NATS to MQTT transformers
        self.register_nats_to_mqtt("home.devices.*.*.state", self._transform_device_state)
        self.register_nats_to_mqtt("home.devices.*.*.event.*", self._transform_device_event)
    
    def register_mqtt_to_nats(self, pattern: str, transformer: Callable):
        """Register MQTT to NATS transformer."""
        self.mqtt_to_nats_transformers[pattern] = transformer
    
    def register_nats_to_mqtt(self, pattern: str, transformer: Callable):
        """Register NATS to MQTT transformer."""
        self.nats_to_mqtt_transformers[pattern] = transformer
    
    async def transform_mqtt_to_nats(self, topic: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform MQTT message to NATS format."""
        # Find matching transformer
        for pattern, transformer in self.mqtt_to_nats_transformers.items():
            if self._match_pattern(topic, pattern, '/'):
                try:
                    return await transformer(topic, data)
                except Exception as e:
                    logger.error(f"Transformer error for {topic}: {e}")
        
        # Default: return as-is
        return data
    
    async def transform_nats_to_mqtt(self, subject: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform NATS message to MQTT format."""
        # Find matching transformer
        for pattern, transformer in self.nats_to_mqtt_transformers.items():
            if self._match_pattern(subject, pattern, '.'):
                try:
                    return await transformer(subject, data)
                except Exception as e:
                    logger.error(f"Transformer error for {subject}: {e}")
        
        # Default: return as-is
        return data
    
    def _match_pattern(self, string: str, pattern: str, separator: str) -> bool:
        """Check if string matches pattern with wildcards."""
        # Convert pattern to regex
        regex_pattern = pattern.replace('+', f'[^{separator}]+').replace('*', f'[^{separator}]+').replace('>', '.*')
        regex_pattern = regex_pattern.replace('#', '.*')
        
        return bool(re.match(f"^{regex_pattern}$", string))
    
    async def _transform_ha_command(self, topic: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform Home Assistant command to NATS format."""
        # Parse topic: homeassistant/component/device/entity/set
        parts = topic.split('/')
        if len(parts) < 5:
            return data
        
        component = parts[1]
        device_id = parts[2]
        entity = parts[3]
        
        # Transform based on component type
        if component == "switch":
            # Convert ON/OFF to boolean
            if isinstance(data, dict) and "value" in data:
                value = data["value"]
            else:
                value = data
            
            return {
                "command": "on" if value in ["ON", "on", "true", True, 1] else "off",
                "entity": entity,
                "source": "home_assistant"
            }
        
        elif component == "light":
            # Handle light commands
            result = {"entity": entity, "source": "home_assistant"}
            
            if "state" in data:
                result["command"] = "on" if data["state"] in ["ON", "on", True] else "off"
            if "brightness" in data:
                result["brightness"] = int(data["brightness"])
            if "color" in data:
                result["color"] = data["color"]
            
            return result
        
        elif component == "climate":
            # Handle climate commands
            return {
                "entity": entity,
                "source": "home_assistant",
                **data
            }
        
        # Default: pass through
        return {
            "entity": entity,
            "source": "home_assistant",
            "data": data
        }
    
    async def _transform_ha_state(self, topic: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform Home Assistant state to NATS format."""
        # Add timestamp if not present
        if "timestamp" not in data:
            data["timestamp"] = datetime.utcnow().isoformat()
        
        return data
    
    async def _transform_device_state(self, subject: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform device state from NATS to MQTT format."""
        # Extract state values
        if "state" in data and isinstance(data["state"], dict):
            # Flatten state dict
            result = {}
            for key, value in data["state"].items():
                result[key] = value
            
            # Add metadata
            if "timestamp" in data:
                result["_timestamp"] = data["timestamp"]
            if "device_id" in data:
                result["_device_id"] = data["device_id"]
            
            return result
        
        return data
    
    async def _transform_device_event(self, subject: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform device event from NATS to MQTT format."""
        # Parse subject: home.devices.type.id.event.name
        parts = subject.split('.')
        if len(parts) < 6:
            return data
        
        event_name = parts[5]
        
        # Transform based on event type
        if event_name in ["motion", "door", "window"]:
            # Binary sensor events
            return {
                event_name: data.get("state", False),
                "timestamp": data.get("timestamp", datetime.utcnow().isoformat())
            }
        
        # Default: include event data
        return {
            "event": event_name,
            "data": data
        }
    
    def create_custom_transformer(self, expression: str) -> Callable:
        """Create custom transformer from expression."""
        # This could be extended to support JSONPath, JMESPath, or custom DSL
        # For now, just return a simple field mapper
        
        def transformer(topic_or_subject: str, data: Dict[str, Any]) -> Dict[str, Any]:
            # Simple field mapping
            # Expression format: "input_field:output_field,..."
            result = {}
            
            for mapping in expression.split(','):
                if ':' in mapping:
                    src, dst = mapping.split(':', 1)
                    if src in data:
                        result[dst] = data[src]
            
            return result or data
        
        return transformer