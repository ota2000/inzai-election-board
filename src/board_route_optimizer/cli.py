"""
Command Line Interface for Board Route Optimizer.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

from .config import Config
from .core.optimizer import RouteOptimizer


def create_parser() -> argparse.ArgumentParser:
    """Create command line argument parser."""
    parser = argparse.ArgumentParser(
        description='Board Route Optimizer',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage with default settings
  python -m board_route_optimizer.cli
  
  # Specify custom data files
  python -m board_route_optimizer.cli --poster-csv data/boards.csv --polling-csv data/offices.csv
  
  # Use API key for road distance calculation
  python -m board_route_optimizer.cli --api-key YOUR_API_KEY
  
  # Custom output location
  python -m board_route_optimizer.cli --output results/routes.geojson
  
  # Load configuration from file
  python -m board_route_optimizer.cli --config config.json
        """
    )
    
    # Data options
    parser.add_argument(
        '--poster-csv',
        type=str,
        default='data/poster_board_locations.csv',
        help='Path to poster board locations CSV file'
    )
    
    parser.add_argument(
        '--polling-csv', 
        type=str,
        default='data/polling_places.csv',
        help='Path to polling places CSV file'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        default='docs/data/poster_board_routes.geojson',
        help='Output GeoJSON file path'
    )
    
    # API options
    parser.add_argument(
        '--api-key',
        type=str,
        help='OpenRouteService API key for road distance calculation'
    )
    
    parser.add_argument(
        '--no-api',
        action='store_true',
        help='Disable API usage and use straight-line distances only'
    )
    
    # Configuration
    parser.add_argument(
        '--config',
        type=str,
        help='Path to JSON configuration file'
    )
    
    parser.add_argument(
        '--walking-speed',
        type=float,
        default=4.0,
        help='Walking speed in km/h (default: 4.0)'
    )
    
    # Output options
    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Suppress non-essential output'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true', 
        help='Enable verbose output'
    )
    
    return parser


def load_config_from_file(config_path: str) -> Config:
    """Load configuration from JSON file."""
    try:
        return Config.from_file(config_path)
    except Exception as e:
        print(f"Error loading config file {config_path}: {e}")
        sys.exit(1)


def create_config_from_args(args) -> Config:
    """Create configuration from command line arguments."""
    if args.config:
        config = load_config_from_file(args.config)
    else:
        config = Config()
    
    # Override with command line arguments
    config.data.poster_board_csv = args.poster_csv
    config.data.polling_places_csv = args.polling_csv
    config.optimization.walking_speed_kmh = args.walking_speed
    
    if args.api_key:
        config.api.api_key = args.api_key
    elif args.no_api:
        config.api.api_key = None
    
    return config


def main():
    """Main CLI entry point."""
    parser = create_parser()
    args = parser.parse_args()
    
    # Configure logging level
    if args.quiet:
        import logging
        logging.basicConfig(level=logging.WARNING)
    elif args.verbose:
        import logging
        logging.basicConfig(level=logging.DEBUG)
    
    try:
        # Create configuration
        config = create_config_from_args(args)
        
        # Initialize optimizer
        optimizer = RouteOptimizer(config)
        
        # Print header
        if not args.quiet:
            print("Board Route Optimizer")
            print("=" * 40)
            
            if config.api.api_key and not args.no_api:
                print("✅ OpenRouteService API key configured.")
            else:
                print("⚠️  Using straight-line distances (no API key).")
        
        # Run optimization
        results = optimizer.optimize_all_districts()
        
        # Export results
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        optimizer.export_geojson(str(output_path))
        
        # Print summary
        if not args.quiet:
            optimizer.print_summary()
            print(f"\\n📁 Generated files:")
            print(f"  - {output_path}")
        
        print(f"\\n🎉 Optimization complete!")
        
    except KeyboardInterrupt:
        print(f"\\n⚠️  Operation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\\n❌ Error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()