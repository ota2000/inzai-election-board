"""
Configuration settings for the Election Board Route Optimizer.
"""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class APIConfig:
    """API configuration settings."""
    openrouteservice_base_url: str = "https://api.openrouteservice.org/v2"
    api_key: Optional[str] = None
    request_delay: float = 1.6  # seconds (for 40 requests/minute limit)
    timeout: int = 30
    max_retries: int = 3
    
    def __post_init__(self):
        """Initialize API key from environment if not provided."""
        if self.api_key is None:
            self.api_key = os.environ.get(
                'OPENROUTESERVICE_API_KEY',
                'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjhjZTk5YzU4OWI4NDQ0ZGE4YTNiZDk2ZDYyNjZhYmI5IiwiaCI6Im11cm11cjY0In0='
            )


@dataclass
class OptimizationConfig:
    """Optimization algorithm settings."""
    walking_speed_kmh: float = 4.0
    max_tsp_iterations: int = 50
    tsp_improvement_threshold: float = 0.01
    
    @property
    def walking_speed_ms(self) -> float:
        """Walking speed in meters per second."""
        return self.walking_speed_kmh * 1000 / 3600


@dataclass
class DataConfig:
    """Data processing configuration."""
    # Data source settings
    use_bigquery: bool = True
    use_bigquery_cache: bool = False  # Use cached BigQuery data from CSV
    
    
    # BigQuery settings
    bigquery_project_id: Optional[str] = None
    bigquery_dataset_id: str = "prd_public"
    bigquery_table_id: str = "poster_boards"
    prefecture: str = "千葉県"
    city: str = "印西市"
    
    # Output settings
    output_directory: str = "docs/data"
    output_filename: str = "poster_board_points.geojson"
    
    # Cache settings
    cache_directory: str = "src/board_route_optimizer/cache"
    
    # Privacy settings
    anonymize_personal_names: bool = True
    personal_name_patterns: list = None
    
    def __post_init__(self):
        """Initialize default personal name patterns."""
        if self.personal_name_patterns is None:
            self.personal_name_patterns = [
                r'[一-龯\w\s]+宅前',
                r'[一-龯\w\s]+宅脇', 
                r'[一-龯\w\s]+宅裏',
                r'[一-龯\w\s]+宅隣',
                r'[一-龯\w\s]+宅横',
                r'[一-龯\w\s]+宅側',
            ]


@dataclass
class Config:
    """Main configuration class."""
    api: APIConfig = None
    optimization: OptimizationConfig = None
    data: DataConfig = None
    
    def __post_init__(self):
        """Initialize sub-configurations."""
        if self.api is None:
            self.api = APIConfig()
        if self.optimization is None:
            self.optimization = OptimizationConfig()
        if self.data is None:
            self.data = DataConfig()
    
    @classmethod
    def from_dict(cls, config_dict: dict) -> 'Config':
        """Create configuration from dictionary."""
        return cls(
            api=APIConfig(**config_dict.get('api', {})),
            optimization=OptimizationConfig(**config_dict.get('optimization', {})),
            data=DataConfig(**config_dict.get('data', {}))
        )
    
    @classmethod
    def from_file(cls, config_path: str) -> 'Config':
        """Load configuration from JSON file."""
        import json
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config_dict = json.load(f)
            return cls.from_dict(config_dict)
        except FileNotFoundError:
            raise FileNotFoundError(f"Configuration file not found: {config_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in configuration file: {e}")
    
    def to_dict(self) -> dict:
        """Convert configuration to dictionary."""
        return {
            'api': {
                'openrouteservice_base_url': self.api.openrouteservice_base_url,
                'request_delay': self.api.request_delay,
                'timeout': self.api.timeout,
                'max_retries': self.api.max_retries
            },
            'optimization': {
                'walking_speed_kmh': self.optimization.walking_speed_kmh,
                'max_tsp_iterations': self.optimization.max_tsp_iterations,
                'tsp_improvement_threshold': self.optimization.tsp_improvement_threshold
            },
            'data': {
                'use_bigquery': self.data.use_bigquery,
                'use_bigquery_cache': self.data.use_bigquery_cache,
                'bigquery_project_id': self.data.bigquery_project_id,
                'bigquery_dataset_id': self.data.bigquery_dataset_id,
                'bigquery_table_id': self.data.bigquery_table_id,
                'prefecture': self.data.prefecture,
                'city': self.data.city,
                'output_directory': self.data.output_directory,
                'output_filename': self.data.output_filename,
                'cache_directory': self.data.cache_directory,
                'anonymize_personal_names': self.data.anonymize_personal_names
            }
        }