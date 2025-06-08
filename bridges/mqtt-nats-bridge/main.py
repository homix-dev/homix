#!/usr/bin/env python3
"""Main entry point for MQTT-NATS Bridge."""

import asyncio
import logging
import sys
import click
from pathlib import Path
from typing import Optional

from .bridge import MQTTNATSBridge
from .config import Config
from .logging_config import setup_logging

logger = logging.getLogger(__name__)


@click.command()
@click.option(
    '--config',
    '-c',
    type=click.Path(exists=True, path_type=Path),
    help='Configuration file (JSON or YAML)'
)
@click.option(
    '--log-level',
    '-l',
    type=click.Choice(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']),
    default='INFO',
    help='Logging level'
)
@click.option(
    '--mqtt-host',
    envvar='MQTT_HOST',
    help='MQTT broker host'
)
@click.option(
    '--mqtt-port',
    envvar='MQTT_PORT',
    type=int,
    help='MQTT broker port'
)
@click.option(
    '--nats-servers',
    envvar='NATS_SERVERS',
    help='NATS server URLs (comma-separated)'
)
@click.option(
    '--dry-run',
    is_flag=True,
    help='Validate configuration without running'
)
def main(
    config: Optional[Path],
    log_level: str,
    mqtt_host: Optional[str],
    mqtt_port: Optional[int],
    nats_servers: Optional[str],
    dry_run: bool
):
    """MQTT-NATS Bridge for Home Assistant integration."""
    
    # Load configuration
    if config:
        cfg = Config.from_file(str(config))
    else:
        cfg = Config.from_env()
    
    # Override with CLI options
    if mqtt_host:
        cfg.mqtt.host = mqtt_host
    if mqtt_port:
        cfg.mqtt.port = mqtt_port
    if nats_servers:
        cfg.nats.servers = nats_servers.split(',')
    if log_level:
        cfg.bridge.log_level = log_level
    
    # Setup logging
    setup_logging(cfg.bridge.log_level, cfg.bridge.log_format)
    
    # Log configuration
    logger.info("MQTT-NATS Bridge starting...")
    logger.info(f"MQTT Broker: {cfg.mqtt.host}:{cfg.mqtt.port}")
    logger.info(f"NATS Servers: {cfg.nats.servers}")
    logger.info(f"Discovery enabled: {cfg.bridge.enable_discovery}")
    logger.info(f"Metrics enabled: {cfg.bridge.enable_metrics}")
    
    if dry_run:
        logger.info("Configuration validated successfully (dry run)")
        return
    
    # Create and run bridge
    bridge = MQTTNATSBridge(cfg)
    
    try:
        asyncio.run(bridge.start())
    except KeyboardInterrupt:
        logger.info("Bridge interrupted by user")
    except Exception as e:
        logger.error(f"Bridge failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()