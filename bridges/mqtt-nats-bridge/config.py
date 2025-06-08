"""Configuration for MQTT-NATS Bridge."""

import os
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv

load_dotenv()


class MQTTConfig(BaseModel):
    """MQTT broker configuration."""
    
    host: str = Field(default="localhost", env="MQTT_HOST")
    port: int = Field(default=1883, env="MQTT_PORT")
    username: Optional[str] = Field(default=None, env="MQTT_USERNAME")
    password: Optional[str] = Field(default=None, env="MQTT_PASSWORD")
    client_id: str = Field(default="nats-mqtt-bridge", env="MQTT_CLIENT_ID")
    keepalive: int = Field(default=60, env="MQTT_KEEPALIVE")
    tls_enabled: bool = Field(default=False, env="MQTT_TLS_ENABLED")
    tls_ca_cert: Optional[str] = Field(default=None, env="MQTT_TLS_CA_CERT")
    tls_cert: Optional[str] = Field(default=None, env="MQTT_TLS_CERT")
    tls_key: Optional[str] = Field(default=None, env="MQTT_TLS_KEY")
    
    @validator("port")
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError("Port must be between 1 and 65535")
        return v


class NATSConfig(BaseModel):
    """NATS server configuration."""
    
    servers: list[str] = Field(
        default=["nats://localhost:4222"],
        env="NATS_SERVERS"
    )
    name: str = Field(default="mqtt-nats-bridge", env="NATS_CLIENT_NAME")
    user: Optional[str] = Field(default=None, env="NATS_USER")
    password: Optional[str] = Field(default=None, env="NATS_PASSWORD")
    token: Optional[str] = Field(default=None, env="NATS_TOKEN")
    tls_cert: Optional[str] = Field(default=None, env="NATS_TLS_CERT")
    tls_key: Optional[str] = Field(default=None, env="NATS_TLS_KEY")
    tls_ca_cert: Optional[str] = Field(default=None, env="NATS_TLS_CA_CERT")
    
    @validator("servers", pre=True)
    def parse_servers(cls, v):
        if isinstance(v, str):
            return v.split(",")
        return v


class BridgeConfig(BaseModel):
    """Bridge configuration."""
    
    # Topic mappings
    mqtt_to_nats_prefix: str = Field(
        default="homeassistant",
        env="MQTT_TO_NATS_PREFIX"
    )
    nats_to_mqtt_prefix: str = Field(
        default="home.devices",
        env="NATS_TO_MQTT_PREFIX"
    )
    
    # Home Assistant discovery
    enable_discovery: bool = Field(default=True, env="ENABLE_DISCOVERY")
    discovery_prefix: str = Field(
        default="homeassistant",
        env="DISCOVERY_PREFIX"
    )
    
    # Performance
    max_concurrent_messages: int = Field(default=100, env="MAX_CONCURRENT_MESSAGES")
    message_buffer_size: int = Field(default=1000, env="MESSAGE_BUFFER_SIZE")
    
    # Monitoring
    enable_metrics: bool = Field(default=True, env="ENABLE_METRICS")
    metrics_port: int = Field(default=9090, env="METRICS_PORT")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(default="json", env="LOG_FORMAT")
    
    # State persistence
    enable_persistence: bool = Field(default=True, env="ENABLE_PERSISTENCE")
    state_file: str = Field(
        default="bridge_state.json",
        env="STATE_FILE"
    )
    
    @validator("log_level")
    def validate_log_level(cls, v):
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"Log level must be one of {valid_levels}")
        return v.upper()


class TopicMapping(BaseModel):
    """Topic mapping configuration."""
    
    mqtt_pattern: str
    nats_pattern: str
    bidirectional: bool = True
    transform: Optional[str] = None  # JSON transformation expression
    filter: Optional[str] = None  # Filter expression


class Config(BaseModel):
    """Main configuration."""
    
    mqtt: MQTTConfig = Field(default_factory=MQTTConfig)
    nats: NATSConfig = Field(default_factory=NATSConfig)
    bridge: BridgeConfig = Field(default_factory=BridgeConfig)
    
    # Custom topic mappings
    topic_mappings: list[TopicMapping] = Field(default_factory=list)
    
    # Device type mappings
    device_type_map: Dict[str, str] = Field(
        default_factory=lambda: {
            "switch": "switch",
            "light": "light",
            "sensor": "sensor",
            "binary_sensor": "binary_sensor",
            "climate": "climate",
            "cover": "cover",
            "fan": "fan",
            "lock": "lock",
            "vacuum": "vacuum",
        }
    )
    
    @classmethod
    def from_env(cls) -> "Config":
        """Create configuration from environment variables."""
        return cls()
    
    @classmethod
    def from_file(cls, path: str) -> "Config":
        """Load configuration from JSON/YAML file."""
        import json
        import yaml
        
        with open(path, "r") as f:
            if path.endswith(".json"):
                data = json.load(f)
            elif path.endswith((".yaml", ".yml")):
                data = yaml.safe_load(f)
            else:
                raise ValueError("Configuration file must be JSON or YAML")
        
        return cls(**data)


# Default configuration instance
config = Config.from_env()