"""State management for bridge."""

import json
import logging
import aiofiles
from typing import Dict, Any, Optional
from datetime import datetime

from .config import Config

logger = logging.getLogger(__name__)


class StateManager:
    """Manage bridge state persistence."""
    
    def __init__(self, config: Config):
        self.config = config
        self.state_file = config.bridge.state_file
        self.state: Dict[str, Any] = {
            "devices": {},
            "last_messages": {},
            "statistics": {
                "messages_bridged": 0,
                "start_time": datetime.utcnow().isoformat(),
            }
        }
    
    async def load_state(self):
        """Load state from file."""
        try:
            async with aiofiles.open(self.state_file, 'r') as f:
                content = await f.read()
                self.state = json.loads(content)
                logger.info(f"Loaded state from {self.state_file}")
        except FileNotFoundError:
            logger.info("No state file found, starting fresh")
        except Exception as e:
            logger.error(f"Error loading state: {e}", exc_info=True)
    
    async def save_state(self):
        """Save state to file."""
        try:
            self.state["last_save"] = datetime.utcnow().isoformat()
            
            async with aiofiles.open(self.state_file, 'w') as f:
                await f.write(json.dumps(self.state, indent=2))
                
            logger.debug(f"Saved state to {self.state_file}")
        except Exception as e:
            logger.error(f"Error saving state: {e}", exc_info=True)
    
    def update_device(self, device_id: str, data: Dict[str, Any]):
        """Update device state."""
        self.state["devices"][device_id] = {
            **data,
            "last_seen": datetime.utcnow().isoformat()
        }
    
    def update_last_message(self, topic_or_subject: str, message: Any):
        """Update last message for topic/subject."""
        self.state["last_messages"][topic_or_subject] = {
            "message": str(message)[:1000],  # Limit size
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def increment_messages_bridged(self):
        """Increment bridged message counter."""
        self.state["statistics"]["messages_bridged"] += 1
    
    def get_device(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Get device state."""
        return self.state["devices"].get(device_id)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get bridge statistics."""
        stats = self.state["statistics"].copy()
        
        # Calculate uptime
        start_time = datetime.fromisoformat(stats["start_time"])
        uptime = datetime.utcnow() - start_time
        stats["uptime_seconds"] = uptime.total_seconds()
        
        return stats