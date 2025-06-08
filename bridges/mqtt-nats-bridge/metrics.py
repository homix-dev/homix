"""Metrics collection for bridge monitoring."""

import logging
from typing import Dict, Any
from prometheus_client import Counter, Gauge, Histogram, Info, start_http_server
import asyncio

from .config import Config

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Collect and expose bridge metrics."""
    
    def __init__(self, config: Config):
        self.config = config
        
        # Define metrics
        self.info = Info('bridge', 'Bridge information')
        
        # Message counters
        self.mqtt_messages = Counter(
            'bridge_mqtt_messages_total',
            'Total MQTT messages received'
        )
        self.nats_messages = Counter(
            'bridge_nats_messages_total',
            'Total NATS messages received'
        )
        self.bridged_messages = Counter(
            'bridge_messages_bridged_total',
            'Total messages successfully bridged',
            ['direction']  # mqtt_to_nats or nats_to_mqtt
        )
        self.dropped_messages = Counter(
            'bridge_messages_dropped_total',
            'Total messages dropped'
        )
        self.errors = Counter(
            'bridge_errors_total',
            'Total errors encountered',
            ['type']
        )
        
        # Connection status
        self.mqtt_connected = Gauge(
            'bridge_mqtt_connected',
            'MQTT connection status (1=connected, 0=disconnected)'
        )
        self.nats_connected = Gauge(
            'bridge_nats_connected',
            'NATS connection status (1=connected, 0=disconnected)'
        )
        
        # Queue sizes
        self.mqtt_queue_size = Gauge(
            'bridge_mqtt_queue_size',
            'Current MQTT to NATS queue size'
        )
        self.nats_queue_size = Gauge(
            'bridge_nats_queue_size',
            'Current NATS to MQTT queue size'
        )
        
        # Discovered devices
        self.discovered_devices = Gauge(
            'bridge_discovered_devices_total',
            'Total discovered devices',
            ['source']  # mqtt or nats
        )
        
        # Message latency
        self.message_latency = Histogram(
            'bridge_message_latency_seconds',
            'Message bridging latency',
            ['direction']
        )
        
        # Set bridge info
        self.info.info({
            'version': '1.0.0',
            'mqtt_broker': f"{config.mqtt.host}:{config.mqtt.port}",
            'nats_servers': ','.join(config.nats.servers),
        })
    
    async def start(self):
        """Start metrics server."""
        if self.config.bridge.enable_metrics:
            start_http_server(self.config.bridge.metrics_port)
            logger.info(f"Metrics server started on port {self.config.bridge.metrics_port}")
    
    async def stop(self):
        """Stop metrics server."""
        # Prometheus HTTP server doesn't have a clean shutdown method
        pass
    
    def increment_mqtt_messages(self):
        """Increment MQTT message counter."""
        self.mqtt_messages.inc()
    
    def increment_nats_messages(self):
        """Increment NATS message counter."""
        self.nats_messages.inc()
    
    def increment_bridged_messages(self, direction: str = "unknown"):
        """Increment bridged message counter."""
        self.bridged_messages.labels(direction=direction).inc()
    
    def increment_dropped_messages(self):
        """Increment dropped message counter."""
        self.dropped_messages.inc()
    
    def increment_errors(self, error_type: str = "unknown"):
        """Increment error counter."""
        self.errors.labels(type=error_type).inc()
    
    def set_mqtt_connected(self, connected: bool):
        """Set MQTT connection status."""
        self.mqtt_connected.set(1 if connected else 0)
    
    def set_nats_connected(self, connected: bool):
        """Set NATS connection status."""
        self.nats_connected.set(1 if connected else 0)
    
    def set_mqtt_queue_size(self, size: int):
        """Set MQTT queue size."""
        self.mqtt_queue_size.set(size)
    
    def set_nats_queue_size(self, size: int):
        """Set NATS queue size."""
        self.nats_queue_size.set(size)
    
    def set_discovered_devices(self, count: int, source: str):
        """Set discovered devices count."""
        self.discovered_devices.labels(source=source).set(count)
    
    def observe_message_latency(self, latency: float, direction: str):
        """Observe message latency."""
        self.message_latency.labels(direction=direction).observe(latency)