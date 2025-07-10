#!/usr/bin/env python3
"""
Test script to verify BigQuery integration with a single district.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from board_route_optimizer.config import Config
from board_route_optimizer.core.optimizer import RouteOptimizer


def test_single_district():
    """Test BigQuery with a single district optimization."""
    
    # Create config with BigQuery enabled
    config = Config()
    config.data.use_bigquery = True
    config.data.bigquery_project_id = "pdf-reader-463007"
    config.data.prefecture = "千葉県"
    config.data.city = "印西市"
    
    # Disable API to avoid serialization issues for now
    config.api.api_key = None
    
    try:
        # Initialize optimizer
        optimizer = RouteOptimizer(config)
        
        # Load data
        print("Loading data from BigQuery...")
        data_loader, voting_offices = optimizer.load_data()
        
        # Get a single district for testing
        districts = data_loader.get_districts()
        test_district = districts[0]  # Get first district
        
        print(f"Testing optimization for: {test_district}")
        
        # Get district data
        district_data = data_loader.get_district_data(test_district)
        print(f"District has {len(district_data)} poster boards")
        
        # Optimize this single district
        result = optimizer.optimize_district(district_data)
        
        print(f"Optimization successful!")
        print(f"Distance: {result['distance']:.2f}m")
        print(f"Duration: {result['duration']:.1f}s")
        print(f"Route points: {len(result['locations'])}")
        
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_single_district()