"""Main MQTT-NATS Bridge implementation."""

import asyncio
import json
import re
import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime
import signal

import nats
from nats.errors import TimeoutError as NATSTimeoutError
from asyncio_mqtt import Client as MQTTClient, MqttError
from paho.mqtt.client import MQTTMessage

from .config import Config, TopicMapping
from .discovery import DiscoveryHandler
from .state import StateManager
from .metrics import MetricsCollector
from .transformers import MessageTransformer

logger = logging.getLogger(__name__)


class MQTTNATSBridge:
    """Bidirectional bridge between MQTT and NATS."""
    
    def __init__(self, config: Config):
        self.config = config
        self.running = False
        
        # Clients
        self.mqtt_client: Optional[MQTTClient] = None
        self.nats_client: Optional[nats.NATS] = None
        
        # Handlers
        self.discovery_handler = DiscoveryHandler(config)
        self.state_manager = StateManager(config)
        self.metrics = MetricsCollector(config) if config.bridge.enable_metrics else None
        self.transformer = MessageTransformer()
        
        # Message queues
        self.mqtt_to_nats_queue: asyncio.Queue = asyncio.Queue(
            maxsize=config.bridge.message_buffer_size
        )
        self.nats_to_mqtt_queue: asyncio.Queue = asyncio.Queue(
            maxsize=config.bridge.message_buffer_size
        )
        
        # Subscriptions tracking
        self.mqtt_subscriptions: set[str] = set()
        self.nats_subscriptions: Dict[str, int] = {}
        
        # Semaphore for concurrent message processing
        self.semaphore = asyncio.Semaphore(config.bridge.max_concurrent_messages)
    
    async def start(self):
        """Start the bridge."""
        logger.info("Starting MQTT-NATS Bridge...")
        self.running = True
        
        # Setup signal handlers
        for sig in (signal.SIGTERM, signal.SIGINT):
            signal.signal(sig, self._signal_handler)
        
        try:
            # Connect to brokers
            await self._connect_mqtt()
            await self._connect_nats()
            
            # Setup subscriptions
            await self._setup_subscriptions()
            
            # Load saved state
            if self.config.bridge.enable_persistence:
                await self.state_manager.load_state()
            
            # Start components
            if self.config.bridge.enable_discovery:
                await self.discovery_handler.start(self.mqtt_client, self.nats_client)
            
            if self.metrics:
                await self.metrics.start()
            
            # Start message processors
            tasks = [
                asyncio.create_task(self._mqtt_to_nats_processor()),
                asyncio.create_task(self._nats_to_mqtt_processor()),
                asyncio.create_task(self._mqtt_message_handler()),
                asyncio.create_task(self._health_check_loop()),
            ]
            
            logger.info("MQTT-NATS Bridge started successfully")
            
            # Wait for shutdown
            await asyncio.gather(*tasks)
            
        except Exception as e:
            logger.error(f"Bridge error: {e}", exc_info=True)
            raise
        finally:
            await self.stop()
    
    async def stop(self):
        """Stop the bridge."""
        logger.info("Stopping MQTT-NATS Bridge...")
        self.running = False
        
        # Save state
        if self.config.bridge.enable_persistence:
            await self.state_manager.save_state()
        
        # Stop components
        if self.discovery_handler:
            await self.discovery_handler.stop()
        
        if self.metrics:
            await self.metrics.stop()
        
        # Disconnect clients
        if self.mqtt_client:
            await self.mqtt_client.disconnect()
        
        if self.nats_client:
            await self.nats_client.close()
        
        logger.info("MQTT-NATS Bridge stopped")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
    
    async def _connect_mqtt(self):
        """Connect to MQTT broker."""
        logger.info(f"Connecting to MQTT broker at {self.config.mqtt.host}:{self.config.mqtt.port}")
        
        self.mqtt_client = MQTTClient(
            hostname=self.config.mqtt.host,
            port=self.config.mqtt.port,
            username=self.config.mqtt.username,
            password=self.config.mqtt.password,
            client_id=self.config.mqtt.client_id,
            keepalive=self.config.mqtt.keepalive,
        )
        
        await self.mqtt_client.connect()
        logger.info("Connected to MQTT broker")
    
    async def _connect_nats(self):
        """Connect to NATS server."""
        logger.info(f"Connecting to NATS servers: {self.config.nats.servers}")
        
        options = {
            "servers": self.config.nats.servers,
            "name": self.config.nats.name,
        }
        
        if self.config.nats.user and self.config.nats.password:
            options["user"] = self.config.nats.user
            options["password"] = self.config.nats.password
        elif self.config.nats.token:
            options["token"] = self.config.nats.token
        
        self.nats_client = await nats.connect(**options)
        logger.info("Connected to NATS server")
    
    async def _setup_subscriptions(self):
        """Setup initial subscriptions."""
        # Default MQTT subscriptions
        mqtt_topics = [
            f"{self.config.bridge.mqtt_to_nats_prefix}/+/+/+/set",  # Commands
            f"{self.config.bridge.mqtt_to_nats_prefix}/+/+/+/state",  # States
            f"{self.config.bridge.discovery_prefix}/+/+/config",  # Discovery
        ]
        
        for topic in mqtt_topics:
            await self.mqtt_client.subscribe(topic)
            self.mqtt_subscriptions.add(topic)
            logger.info(f"Subscribed to MQTT topic: {topic}")
        
        # Default NATS subscriptions
        nats_subjects = [
            f"{self.config.bridge.nats_to_mqtt_prefix}.>",  # All device messages
            "home.discovery.>",  # Discovery messages
        ]
        
        for subject in nats_subjects:
            sub = await self.nats_client.subscribe(
                subject,
                cb=self._nats_message_callback
            )
            self.nats_subscriptions[subject] = sub.sid
            logger.info(f"Subscribed to NATS subject: {subject}")
        
        # Custom topic mappings
        for mapping in self.config.topic_mappings:
            if mapping.mqtt_pattern:
                await self.mqtt_client.subscribe(mapping.mqtt_pattern)
                self.mqtt_subscriptions.add(mapping.mqtt_pattern)
            
            if mapping.nats_pattern and mapping.bidirectional:
                sub = await self.nats_client.subscribe(
                    mapping.nats_pattern,
                    cb=self._nats_message_callback
                )
                self.nats_subscriptions[mapping.nats_pattern] = sub.sid
    
    async def _mqtt_message_handler(self):
        """Handle incoming MQTT messages."""
        async with self.mqtt_client.messages() as messages:
            async for message in messages:
                if not self.running:
                    break
                
                try:
                    await self.mqtt_to_nats_queue.put(message)
                    
                    if self.metrics:
                        self.metrics.increment_mqtt_messages()
                        
                except asyncio.QueueFull:
                    logger.warning("MQTT to NATS queue full, dropping message")
                    if self.metrics:
                        self.metrics.increment_dropped_messages()
    
    async def _nats_message_callback(self, msg):
        """Handle incoming NATS messages."""
        try:
            await self.nats_to_mqtt_queue.put(msg)
            
            if self.metrics:
                self.metrics.increment_nats_messages()
                
        except asyncio.QueueFull:
            logger.warning("NATS to MQTT queue full, dropping message")
            if self.metrics:
                self.metrics.increment_dropped_messages()
    
    async def _mqtt_to_nats_processor(self):
        """Process messages from MQTT to NATS."""
        while self.running:
            try:
                # Get message from queue
                message = await asyncio.wait_for(
                    self.mqtt_to_nats_queue.get(),
                    timeout=1.0
                )
                
                async with self.semaphore:
                    await self._process_mqtt_to_nats(message)
                    
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error processing MQTT to NATS: {e}", exc_info=True)
    
    async def _nats_to_mqtt_processor(self):
        """Process messages from NATS to MQTT."""
        while self.running:
            try:
                # Get message from queue
                msg = await asyncio.wait_for(
                    self.nats_to_mqtt_queue.get(),
                    timeout=1.0
                )
                
                async with self.semaphore:
                    await self._process_nats_to_mqtt(msg)
                    
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error processing NATS to MQTT: {e}", exc_info=True)
    
    async def _process_mqtt_to_nats(self, message: MQTTMessage):
        """Process a single MQTT message to NATS."""
        topic = message.topic.value
        payload = message.payload.decode('utf-8')
        
        logger.debug(f"MQTT -> NATS: {topic} = {payload}")
        
        # Check if it's a discovery message
        if topic.startswith(self.config.bridge.discovery_prefix):
            await self.discovery_handler.handle_mqtt_discovery(topic, payload)
            return
        
        # Transform topic to NATS subject
        subject = self._mqtt_topic_to_nats_subject(topic)
        if not subject:
            return
        
        # Transform payload if needed
        try:
            data = json.loads(payload) if payload else {}
        except json.JSONDecodeError:
            data = {"value": payload}
        
        # Add metadata
        data["_bridge"] = {
            "source": "mqtt",
            "timestamp": datetime.utcnow().isoformat(),
            "topic": topic
        }
        
        # Apply transformations
        data = await self.transformer.transform_mqtt_to_nats(topic, data)
        
        # Publish to NATS
        try:
            await self.nats_client.publish(
                subject,
                json.dumps(data).encode('utf-8')
            )
            logger.debug(f"Published to NATS: {subject}")
            
            if self.metrics:
                self.metrics.increment_bridged_messages()
                
        except Exception as e:
            logger.error(f"Failed to publish to NATS: {e}")
            if self.metrics:
                self.metrics.increment_errors()
    
    async def _process_nats_to_mqtt(self, msg):
        """Process a single NATS message to MQTT."""
        subject = msg.subject
        
        try:
            data = json.loads(msg.data.decode('utf-8'))
        except json.JSONDecodeError:
            data = {"value": msg.data.decode('utf-8')}
        
        logger.debug(f"NATS -> MQTT: {subject} = {data}")
        
        # Check if it's a discovery message
        if subject.startswith("home.discovery"):
            await self.discovery_handler.handle_nats_discovery(subject, data)
            return
        
        # Transform subject to MQTT topic
        topic = self._nats_subject_to_mqtt_topic(subject)
        if not topic:
            return
        
        # Apply transformations
        data = await self.transformer.transform_nats_to_mqtt(subject, data)
        
        # Remove bridge metadata
        data.pop("_bridge", None)
        
        # Publish to MQTT
        try:
            await self.mqtt_client.publish(
                topic,
                json.dumps(data).encode('utf-8'),
                qos=1,
                retain=True
            )
            logger.debug(f"Published to MQTT: {topic}")
            
            if self.metrics:
                self.metrics.increment_bridged_messages()
                
        except Exception as e:
            logger.error(f"Failed to publish to MQTT: {e}")
            if self.metrics:
                self.metrics.increment_errors()
    
    def _mqtt_topic_to_nats_subject(self, topic: str) -> Optional[str]:
        """Convert MQTT topic to NATS subject."""
        # Check custom mappings first
        for mapping in self.config.topic_mappings:
            if re.match(mapping.mqtt_pattern.replace('+', '[^/]+').replace('#', '.*'), topic):
                # Apply pattern transformation
                return re.sub(
                    mapping.mqtt_pattern.replace('+', '([^/]+)').replace('#', '(.*)'),
                    mapping.nats_pattern,
                    topic
                )
        
        # Default transformation
        # homeassistant/switch/device_id/relay1/set -> home.devices.switch.device_id.command.relay1
        parts = topic.split('/')
        if len(parts) >= 4 and parts[0] == self.config.bridge.mqtt_to_nats_prefix:
            device_type = parts[1]
            device_id = parts[2]
            entity = parts[3]
            
            if topic.endswith('/set'):
                return f"home.devices.{device_type}.{device_id}.command.{entity}"
            elif topic.endswith('/state'):
                return f"home.devices.{device_type}.{device_id}.state"
        
        return None
    
    def _nats_subject_to_mqtt_topic(self, subject: str) -> Optional[str]:
        """Convert NATS subject to MQTT topic."""
        # Check custom mappings first
        for mapping in self.config.topic_mappings:
            if mapping.bidirectional and re.match(
                mapping.nats_pattern.replace('*', '[^.]+').replace('>', '.*'),
                subject
            ):
                # Apply pattern transformation
                return re.sub(
                    mapping.nats_pattern.replace('*', '([^.]+)').replace('>', '(.*)'),
                    mapping.mqtt_pattern,
                    subject
                )
        
        # Default transformation
        # home.devices.switch.device_id.state -> homeassistant/switch/device_id/state
        parts = subject.split('.')
        if len(parts) >= 5 and subject.startswith(self.config.bridge.nats_to_mqtt_prefix):
            device_type = parts[2]
            device_id = parts[3]
            
            if parts[4] == "state":
                # State updates - need to parse the state data
                return f"{self.config.bridge.discovery_prefix}/{device_type}/{device_id}/state"
            elif parts[4] == "event":
                # Events - convert to appropriate topic
                entity = parts[5] if len(parts) > 5 else "event"
                return f"{self.config.bridge.discovery_prefix}/{device_type}/{device_id}/{entity}"
        
        return None
    
    async def _health_check_loop(self):
        """Periodic health check."""
        while self.running:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                # Check MQTT connection
                if self.mqtt_client and not self.mqtt_client._client.is_connected():
                    logger.warning("MQTT connection lost, reconnecting...")
                    await self._connect_mqtt()
                    await self._setup_subscriptions()
                
                # Check NATS connection
                if self.nats_client and not self.nats_client.is_connected:
                    logger.warning("NATS connection lost, reconnecting...")
                    await self._connect_nats()
                    await self._setup_subscriptions()
                
            except Exception as e:
                logger.error(f"Health check error: {e}", exc_info=True)