#!/usr/bin/env python3
"""
NATS Home Automation - Basic Messaging Patterns Examples

This script demonstrates the core messaging patterns for the home automation system.
"""

import asyncio
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

import nats
from nats.aio.client import Client
from nats.js import JetStreamContext

# Configuration
NATS_URL = "nats://home:changeme@localhost:4222"

class HomeAutomationPatterns:
    def __init__(self):
        self.nc: Optional[Client] = None
        self.js: Optional[JetStreamContext] = None
        
    async def connect(self):
        """Connect to NATS server"""
        self.nc = await nats.connect(NATS_URL)
        self.js = self.nc.jetstream()
        print(f"Connected to NATS at {NATS_URL}")
        
    async def close(self):
        """Close NATS connection"""
        if self.nc:
            await self.nc.close()
            
    # Pattern 1: Publish Only (Device State Updates)
    async def publish_sensor_state(self, device_id: str, temperature: float, humidity: float):
        """Publish sensor state update"""
        subject = f"home.devices.sensor.{device_id}.state"
        payload = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "device_id": device_id,
            "state": {
                "temperature": temperature,
                "humidity": humidity,
                "unit": "celsius"
            },
            "attributes": {
                "battery": 85,
                "rssi": -45
            }
        }
        
        await self.nc.publish(subject, json.dumps(payload).encode())
        print(f"Published to {subject}: {payload}")
        
    # Pattern 2: Request/Reply (Device Commands)
    async def send_switch_command(self, device_id: str, state: str):
        """Send command to switch and wait for response"""
        subject = f"home.devices.switch.{device_id}.command"
        payload = {
            "command": "set_state",
            "parameters": {
                "state": state
            },
            "request_id": str(uuid.uuid4())
        }
        
        try:
            response = await self.nc.request(
                subject, 
                json.dumps(payload).encode(),
                timeout=5.0
            )
            result = json.loads(response.data.decode())
            print(f"Command response from {device_id}: {result}")
            return result
        except asyncio.TimeoutError:
            print(f"Command timeout for {device_id}")
            return None
            
    # Pattern 3: Device Discovery
    async def announce_device(self, device_info: Dict[str, Any]):
        """Announce a new device"""
        subject = "home.discovery.announce"
        await self.nc.publish(subject, json.dumps(device_info).encode())
        print(f"Device announced: {device_info['device_id']}")
        
    # Pattern 4: Subscribe to All Device States
    async def subscribe_to_states(self):
        """Subscribe to all device state updates"""
        subject = "home.devices.*.*.state"
        
        async def message_handler(msg):
            data = json.loads(msg.data.decode())
            print(f"State update on {msg.subject}: {data}")
            
        sub = await self.nc.subscribe(subject, cb=message_handler)
        print(f"Subscribed to {subject}")
        return sub
        
    # Pattern 5: Service Health Check (Request/Reply Server)
    async def start_health_check_responder(self):
        """Respond to health check requests"""
        subject = "home.services.examples.status"
        
        async def request_handler(msg):
            response = {
                "service": "examples",
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "version": "1.0.0"
            }
            await msg.respond(json.dumps(response).encode())
            
        sub = await self.nc.subscribe(subject, cb=request_handler)
        print(f"Health check responder started on {subject}")
        return sub
        
    # Pattern 6: Event Publishing
    async def publish_event(self, event_type: str, event_data: Dict[str, Any]):
        """Publish system event"""
        subject = f"home.events.system.{event_type}"
        payload = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": event_type,
            "data": event_data
        }
        
        await self.nc.publish(subject, json.dumps(payload).encode())
        print(f"Event published to {subject}: {payload}")
        
    # Pattern 7: KV Store Configuration
    async def store_device_config(self, device_id: str, config: Dict[str, Any]):
        """Store device configuration in KV store"""
        kv = await self.js.create_key_value(bucket="device_configs")
        key = f"device.{device_id}"
        await kv.put(key, json.dumps(config).encode())
        print(f"Stored config for {device_id}")
        
    async def get_device_config(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve device configuration from KV store"""
        try:
            kv = await self.js.key_value(bucket="device_configs")
            key = f"device.{device_id}"
            entry = await kv.get(key)
            if entry and entry.value:
                config = json.loads(entry.value.decode())
                print(f"Retrieved config for {device_id}: {config}")
                return config
        except:
            print(f"No config found for {device_id}")
        return None

async def demonstrate_patterns():
    """Demonstrate all messaging patterns"""
    ha = HomeAutomationPatterns()
    
    try:
        # Connect to NATS
        await ha.connect()
        
        print("\n=== NATS Home Automation Messaging Patterns Demo ===\n")
        
        # Start health check responder
        health_sub = await ha.start_health_check_responder()
        
        # Subscribe to all device states
        state_sub = await ha.subscribe_to_states()
        
        # Pattern demonstrations
        print("\n1. Publishing sensor state...")
        await ha.publish_sensor_state("temp01", 22.5, 45.0)
        
        print("\n2. Announcing a new device...")
        device_info = {
            "device_id": "temp01",
            "device_type": "sensor",
            "manufacturer": "Generic",
            "model": "TH01",
            "name": "Living Room Temperature",
            "capabilities": {
                "sensors": ["temperature", "humidity"],
                "units": {
                    "temperature": "celsius",
                    "humidity": "percent"
                }
            },
            "topics": {
                "state": "home.devices.sensor.temp01.state",
                "status": "home.devices.sensor.temp01.status",
                "command": "home.devices.sensor.temp01.command"
            }
        }
        await ha.announce_device(device_info)
        
        print("\n3. Publishing system event...")
        await ha.publish_event("startup", {"service": "examples", "version": "1.0.0"})
        
        print("\n4. Storing device configuration...")
        config = {
            "name": "Living Room Temperature",
            "update_interval": 60,
            "calibration": {
                "temperature_offset": 0.5,
                "humidity_offset": -2.0
            }
        }
        await ha.store_device_config("temp01", config)
        
        print("\n5. Retrieving device configuration...")
        retrieved_config = await ha.get_device_config("temp01")
        
        print("\n6. Checking service health...")
        health_response = await ha.nc.request(
            "home.services.examples.status",
            b"",
            timeout=2.0
        )
        health_data = json.loads(health_response.data.decode())
        print(f"Health check response: {health_data}")
        
        # Keep running for a bit to show subscriptions working
        print("\n\nListening for messages... (Press Ctrl+C to exit)")
        await asyncio.sleep(60)
        
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        await ha.close()

if __name__ == "__main__":
    try:
        asyncio.run(demonstrate_patterns())
    except KeyboardInterrupt:
        sys.exit(0)