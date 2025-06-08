"""MQTT-NATS Bridge for Home Assistant integration."""

from .bridge import MQTTNATSBridge
from .config import Config
from .discovery import DiscoveryHandler
from .state import StateManager
from .metrics import MetricsCollector
from .transformers import MessageTransformer

__version__ = "1.0.0"

__all__ = [
    "MQTTNATSBridge",
    "Config",
    "DiscoveryHandler",
    "StateManager",
    "MetricsCollector",
    "MessageTransformer",
]