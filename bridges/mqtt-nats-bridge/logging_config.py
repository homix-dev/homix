"""Logging configuration for bridge."""

import logging
import sys
from typing import Optional
import colorlog
from pythonjsonlogger import jsonlogger


def setup_logging(level: str = "INFO", format_type: str = "json"):
    """Setup logging configuration."""
    
    # Convert level string to logging level
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    # Clear existing handlers
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    
    # Set formatter based on format type
    if format_type == "json":
        formatter = jsonlogger.JsonFormatter(
            "%(timestamp)s %(level)s %(name)s %(message)s",
            rename_fields={"levelname": "level", "asctime": "timestamp"}
        )
    elif format_type == "color":
        formatter = colorlog.ColoredFormatter(
            "%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
            log_colors={
                'DEBUG': 'cyan',
                'INFO': 'green',
                'WARNING': 'yellow',
                'ERROR': 'red',
                'CRITICAL': 'red,bg_white',
            }
        )
    else:
        # Plain format
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
    
    handler.setFormatter(formatter)
    
    # Configure root logger
    root_logger.setLevel(log_level)
    root_logger.addHandler(handler)
    
    # Set levels for specific loggers
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("nats").setLevel(logging.WARNING)
    logging.getLogger("paho").setLevel(logging.WARNING)
    
    # Log initial message
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured: level={level}, format={format_type}")