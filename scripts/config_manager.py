import json
import os
from typing import Dict, Any

class ConfigManager:
    
    def __init__(self, config_file: str = "config.json"):
        self.config_file = config_file
        self.default_config = {
            "sustain_enabled": False,
            "velocity_enabled": False,
            "tempo": 100.0,
            "no_doubles": True,
            "hold_keys": False,
            "keyboard_controls_enabled": True,
            "keyboard_bindings": {
                "f1": "play",
                "f2": "pause", 
                "f3": "stop",
                "f4": "slow_down",
                "f5": "speed_up",
                "f6": "toggle_sustain",
                "f7": "toggle_velocity"
            }
        }
        self.config = self.load_config()
    
    def load_config(self) -> Dict[str, Any]:
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                merged_config = self.default_config.copy()
                merged_config.update(config)
                return merged_config
            else:
                self.save_config(self.default_config)
                return self.default_config.copy()
        except Exception as e:
            print(f"Error loading config: {e}. Using defaults.")
            return self.default_config.copy()
    
    def save_config(self, config: Dict[str, Any] = None) -> bool:
        try:
            config_to_save = config if config is not None else self.config
            with open(self.config_file, 'w') as f:
                json.dump(config_to_save, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving config: {e}")
            return False
    
    def get(self, key: str, default=None):
        return self.config.get(key, default)
    
    def set(self, key: str, value: Any) -> bool:
        self.config[key] = value
        return self.save_config()
    
    def update(self, updates: Dict[str, Any]) -> bool:
        self.config.update(updates)
        return self.save_config()
    
    def reset_to_defaults(self) -> bool:
        self.config = self.default_config.copy()
        return self.save_config()
