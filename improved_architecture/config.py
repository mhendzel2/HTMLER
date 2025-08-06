"""
Configuration management module for the Earnings Analysis Application.

This module provides centralized configuration management with support for
multiple configuration sources including environment variables, configuration
files, and user preferences.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from dataclasses import dataclass, asdict
from cryptography.fernet import Fernet


@dataclass
class APIConfig:
    """Configuration for API connections."""
    base_url: str = "https://api.unusualwhales.com"
    timeout: int = 30
    rate_limit_per_second: float = 10.0
    max_retries: int = 3
    retry_backoff_factor: float = 1.5


@dataclass
class DatabaseConfig:
    """Configuration for database connections."""
    url: str = "sqlite:///earnings_analysis.db"
    pool_size: int = 5
    max_overflow: int = 10
    echo: bool = False


@dataclass
class UIConfig:
    """Configuration for user interface."""
    theme: str = "light"
    default_chart_style: str = "seaborn"
    auto_refresh_interval: int = 300  # seconds
    max_watchlist_size: int = 100


@dataclass
class CacheConfig:
    """Configuration for caching."""
    enabled: bool = True
    default_ttl: int = 300  # seconds
    max_size: int = 1000
    cleanup_interval: int = 3600  # seconds


@dataclass
class SecurityConfig:
    """Configuration for security settings."""
    encrypt_credentials: bool = True
    session_timeout: int = 3600  # seconds
    audit_logging: bool = True
    max_login_attempts: int = 3


class ConfigManager:
    """
    Centralized configuration manager with support for multiple sources
    and secure credential storage.
    """
    
    def __init__(self, config_file: Optional[str] = None):
        self.config_file = config_file or self._get_default_config_file()
        self.logger = logging.getLogger(__name__)
        self._encryption_key = self._get_or_create_encryption_key()
        self._config_cache = {}
        
        # Initialize configuration sections
        self.api = APIConfig()
        self.database = DatabaseConfig()
        self.ui = UIConfig()
        self.cache = CacheConfig()
        self.security = SecurityConfig()
        
        self._load_configuration()
    
    def _get_default_config_file(self) -> str:
        """Get the default configuration file path."""
        config_dir = Path.home() / ".earnings_analysis"
        config_dir.mkdir(exist_ok=True)
        return str(config_dir / "config.json")
    
    def _get_or_create_encryption_key(self) -> bytes:
        """Get or create encryption key for secure credential storage."""
        key_file = Path(self.config_file).parent / "encryption.key"
        
        if key_file.exists():
            return key_file.read_bytes()
        else:
            key = Fernet.generate_key()
            key_file.write_bytes(key)
            key_file.chmod(0o600)  # Restrict permissions
            return key
    
    def _load_configuration(self):
        """Load configuration from all sources."""
        # Load from file
        self._load_from_file()
        
        # Override with environment variables
        self._load_from_environment()
        
        # Validate configuration
        self._validate_configuration()
    
    def _load_from_file(self):
        """Load configuration from JSON file."""
        if not os.path.exists(self.config_file):
            self.logger.info(f"Configuration file {self.config_file} not found, using defaults")
            return
        
        try:
            with open(self.config_file, 'r') as f:
                config_data = json.load(f)
            
            # Update configuration sections
            if 'api' in config_data:
                self.api = APIConfig(**config_data['api'])
            if 'database' in config_data:
                self.database = DatabaseConfig(**config_data['database'])
            if 'ui' in config_data:
                self.ui = UIConfig(**config_data['ui'])
            if 'cache' in config_data:
                self.cache = CacheConfig(**config_data['cache'])
            if 'security' in config_data:
                self.security = SecurityConfig(**config_data['security'])
                
        except Exception as e:
            self.logger.error(f"Error loading configuration file: {e}")
    
    def _load_from_environment(self):
        """Load configuration from environment variables."""
        # API configuration
        if os.getenv('UW_API_BASE_URL'):
            self.api.base_url = os.getenv('UW_API_BASE_URL')
        if os.getenv('UW_API_TIMEOUT'):
            self.api.timeout = int(os.getenv('UW_API_TIMEOUT'))
        if os.getenv('UW_API_RATE_LIMIT'):
            self.api.rate_limit_per_second = float(os.getenv('UW_API_RATE_LIMIT'))
        
        # Database configuration
        if os.getenv('DATABASE_URL'):
            self.database.url = os.getenv('DATABASE_URL')
        if os.getenv('DATABASE_ECHO'):
            self.database.echo = os.getenv('DATABASE_ECHO').lower() == 'true'
        
        # UI configuration
        if os.getenv('UI_THEME'):
            self.ui.theme = os.getenv('UI_THEME')
        if os.getenv('UI_AUTO_REFRESH'):
            self.ui.auto_refresh_interval = int(os.getenv('UI_AUTO_REFRESH'))
    
    def _validate_configuration(self):
        """Validate configuration values."""
        if self.api.rate_limit_per_second <= 0:
            raise ValueError("API rate limit must be positive")
        
        if self.api.timeout <= 0:
            raise ValueError("API timeout must be positive")
        
        if self.cache.default_ttl <= 0:
            raise ValueError("Cache TTL must be positive")
        
        if self.ui.auto_refresh_interval <= 0:
            raise ValueError("Auto refresh interval must be positive")
    
    def save_configuration(self):
        """Save current configuration to file."""
        config_data = {
            'api': asdict(self.api),
            'database': asdict(self.database),
            'ui': asdict(self.ui),
            'cache': asdict(self.cache),
            'security': asdict(self.security)
        }
        
        try:
            with open(self.config_file, 'w') as f:
                json.dump(config_data, f, indent=2)
            self.logger.info(f"Configuration saved to {self.config_file}")
        except Exception as e:
            self.logger.error(f"Error saving configuration: {e}")
    
    def get_api_token(self) -> Optional[str]:
        """Get API token from secure storage."""
        # First try environment variable
        token = os.getenv('UNUSUAL_WHALES_API_KEY')
        if token:
            return token
        
        # Try encrypted storage
        return self._get_encrypted_credential('api_token')
    
    def set_api_token(self, token: str):
        """Store API token securely."""
        self._set_encrypted_credential('api_token', token)
    
    def _get_encrypted_credential(self, key: str) -> Optional[str]:
        """Get encrypted credential from storage."""
        try:
            credentials_file = Path(self.config_file).parent / "credentials.enc"
            if not credentials_file.exists():
                return None
            
            fernet = Fernet(self._encryption_key)
            encrypted_data = credentials_file.read_bytes()
            decrypted_data = fernet.decrypt(encrypted_data)
            credentials = json.loads(decrypted_data.decode())
            
            return credentials.get(key)
        except Exception as e:
            self.logger.error(f"Error reading encrypted credential {key}: {e}")
            return None
    
    def _set_encrypted_credential(self, key: str, value: str):
        """Store encrypted credential."""
        try:
            credentials_file = Path(self.config_file).parent / "credentials.enc"
            
            # Load existing credentials
            credentials = {}
            if credentials_file.exists():
                fernet = Fernet(self._encryption_key)
                encrypted_data = credentials_file.read_bytes()
                decrypted_data = fernet.decrypt(encrypted_data)
                credentials = json.loads(decrypted_data.decode())
            
            # Update credential
            credentials[key] = value
            
            # Encrypt and save
            fernet = Fernet(self._encryption_key)
            encrypted_data = fernet.encrypt(json.dumps(credentials).encode())
            credentials_file.write_bytes(encrypted_data)
            credentials_file.chmod(0o600)  # Restrict permissions
            
        except Exception as e:
            self.logger.error(f"Error storing encrypted credential {key}: {e}")
    
    def get_user_preference(self, key: str, default: Any = None) -> Any:
        """Get user preference with caching."""
        if key in self._config_cache:
            return self._config_cache[key]
        
        # Load from database or file
        value = self._load_user_preference(key, default)
        self._config_cache[key] = value
        return value
    
    def set_user_preference(self, key: str, value: Any):
        """Set user preference."""
        self._config_cache[key] = value
        self._save_user_preference(key, value)
    
    def _load_user_preference(self, key: str, default: Any) -> Any:
        """Load user preference from storage."""
        # Implementation would load from database
        return default
    
    def _save_user_preference(self, key: str, value: Any):
        """Save user preference to storage."""
        # Implementation would save to database
        pass


# Global configuration instance
config = ConfigManager()

