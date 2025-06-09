#!/usr/bin/env python3
"""
Demo script showing bidirectional control between Home Assistant and NATS
"""
import asyncio
import json
import sys
from datetime import datetime
import nats


class HANATSDemo:
    def __init__(self):
        self.nc = None
        self.devices = {}
        
    async def connect(self):
        """Connect to NATS server"""
        try:
            self.nc = await nats.connect("nats://home:changeme@localhost:4222")
            print("✓ Connected to NATS")
        except Exception as e:
            print(f"✗ Failed to connect: {e}")
            sys.exit(1)
    
    async def discover_devices(self):
        """Discover all devices on NATS"""
        print("\n🔍 Discovering devices...")
        
        discovered = []
        
        async def discovery_handler(msg):
            try:
                device = json.loads(msg.data.decode())
                discovered.append(device)
            except:
                pass
        
        # Subscribe to existing device states
        sub = await self.nc.subscribe("home.devices.*.*.state", cb=discovery_handler)
        
        # Request discovery from all devices
        await self.nc.publish("home.discovery.request", b"{}")
        
        # Wait for responses
        await asyncio.sleep(2)
        await sub.unsubscribe()
        
        # Store devices
        for device in discovered:
            if 'device_id' in device:
                self.devices[device['device_id']] = device
                print(f"  • Found: {device.get('device_id')} ({device.get('device_type', 'unknown')})")
        
        print(f"\n✓ Found {len(self.devices)} devices")
        return self.devices
    
    async def monitor_states(self, duration=10):
        """Monitor device state changes"""
        print(f"\n📊 Monitoring device states for {duration} seconds...")
        
        state_updates = []
        
        async def state_handler(msg):
            try:
                # Parse subject to get device info
                parts = msg.subject.split('.')
                device_type = parts[2] if len(parts) > 2 else 'unknown'
                device_id = parts[3] if len(parts) > 3 else 'unknown'
                
                # Parse state data
                state = json.loads(msg.data.decode())
                
                timestamp = datetime.now().strftime("%H:%M:%S")
                print(f"  [{timestamp}] {device_type}/{device_id}: {state}")
                
                state_updates.append({
                    'time': timestamp,
                    'device': device_id,
                    'type': device_type,
                    'state': state
                })
            except Exception as e:
                print(f"  Error parsing state: {e}")
        
        # Subscribe to all state updates
        sub = await self.nc.subscribe("home.devices.*.*.state", cb=state_handler)
        
        # Monitor for specified duration
        await asyncio.sleep(duration)
        await sub.unsubscribe()
        
        print(f"\n✓ Captured {len(state_updates)} state updates")
        return state_updates
    
    async def control_device(self, device_type, device_id, action, params=None):
        """Send control command to a device"""
        subject = f"home.devices.{device_type}.{device_id}.command"
        
        command = {"action": action}
        if params:
            command.update(params)
        
        print(f"\n🎮 Controlling {device_type}/{device_id}")
        print(f"  Command: {command}")
        
        try:
            # Send command and wait for response
            response = await self.nc.request(
                subject, 
                json.dumps(command).encode(),
                timeout=5.0
            )
            
            result = json.loads(response.data.decode())
            print(f"  Response: {result}")
            return result
            
        except asyncio.TimeoutError:
            print("  ✗ No response (timeout)")
            return None
        except Exception as e:
            print(f"  ✗ Error: {e}")
            return None
    
    async def create_virtual_sensor(self):
        """Create a virtual sensor that appears in Home Assistant"""
        print("\n🔧 Creating virtual sensor...")
        
        device_info = {
            "device_id": "demo-temp-sensor",
            "device_type": "sensor",
            "name": "Demo Temperature Sensor",
            "manufacturer": "NATS Demo",
            "model": "Virtual-1.0",
            "capabilities": {
                "sensors": ["temperature", "humidity"],
                "units": {
                    "temperature": "°C",
                    "humidity": "%"
                },
                "update_interval": 10
            }
        }
        
        # Announce device
        await self.nc.publish(
            "home.discovery.announce",
            json.dumps(device_info).encode()
        )
        
        print(f"  ✓ Announced device: {device_info['device_id']}")
        
        # Publish some readings
        for i in range(5):
            temp = 20 + (i * 0.5)
            humidity = 45 + (i * 2)
            
            state = {
                "device_id": device_info["device_id"],
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "temperature": temp,
                    "humidity": humidity
                }
            }
            
            await self.nc.publish(
                f"home.devices.sensor.{device_info['device_id']}.state",
                json.dumps(state).encode()
            )
            
            print(f"  📤 Published: temp={temp}°C, humidity={humidity}%")
            await asyncio.sleep(2)
        
        return device_info
    
    async def demo_ha_control(self):
        """Demonstrate controlling HA entities through NATS"""
        print("\n🏠 Home Assistant Control Demo")
        print("================================")
        
        # Example: Control switches
        print("\n1️⃣ Controlling Switches:")
        for switch_id in ["living_room", "kitchen", "bedroom"]:
            print(f"\n  Testing switch.{switch_id}:")
            
            # Turn on
            await self.control_device("switch", switch_id, "on")
            await asyncio.sleep(1)
            
            # Turn off
            await self.control_device("switch", switch_id, "off")
            await asyncio.sleep(1)
            
            # Toggle
            await self.control_device("switch", switch_id, "toggle")
        
        # Example: Control lights with parameters
        print("\n2️⃣ Controlling Lights:")
        await self.control_device(
            "light", "living_room", "on",
            {"brightness": 80, "color": "warm_white"}
        )
        
        # Example: Set climate
        print("\n3️⃣ Controlling Climate:")
        await self.control_device(
            "climate", "thermostat", "set_temperature",
            {"temperature": 22, "mode": "cool"}
        )
        
        # Example: Control covers
        print("\n4️⃣ Controlling Covers:")
        await self.control_device(
            "cover", "garage", "open"
        )
        await asyncio.sleep(2)
        await self.control_device(
            "cover", "garage", "set_position",
            {"position": 50}
        )
    
    async def run_demo(self):
        """Run the complete demo"""
        try:
            # Connect
            await self.connect()
            
            # Discover devices
            await self.discover_devices()
            
            # Create virtual sensor
            await self.create_virtual_sensor()
            
            # Monitor states
            await self.monitor_states(duration=5)
            
            # Demo HA control
            await self.demo_ha_control()
            
            print("\n✅ Demo completed!")
            
        finally:
            if self.nc:
                await self.nc.close()


async def main():
    """Main entry point"""
    print("NATS ↔ Home Assistant Integration Demo")
    print("=" * 40)
    print("\nThis demo shows bidirectional control between")
    print("Home Assistant and NATS-based devices.\n")
    
    demo = HANATSDemo()
    await demo.run_demo()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Demo interrupted")