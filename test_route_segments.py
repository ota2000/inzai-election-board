#!/usr/bin/env python3
"""
Test script to verify route segment generation with a single district.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from board_route_optimizer.config import Config
from board_route_optimizer.core.optimizer import RouteOptimizer


def test_route_segments():
    """Test route segment generation with a single district."""
    
    # Create config with BigQuery enabled
    config = Config()
    config.data.use_bigquery = True
    config.data.bigquery_project_id = "pdf-reader-463007"
    config.data.prefecture = "千葉県"
    config.data.city = "印西市"
    
    try:
        # Initialize optimizer
        optimizer = RouteOptimizer(config)
        
        # Load data
        print("Loading data from BigQuery...")
        data_loader, voting_offices = optimizer.load_data()
        
        # Get districts and select smallest one for testing
        districts = data_loader.get_districts()
        district_sizes = []
        
        for district in districts:
            district_data = data_loader.get_district_data(district)
            district_sizes.append((district, len(district_data)))
        
        # Sort by size and pick smallest with at least 3 boards
        district_sizes.sort(key=lambda x: x[1])
        test_district, size = None, 0
        
        for district, board_count in district_sizes:
            if board_count >= 3:
                test_district, size = district, board_count
                break
        
        print(f"Testing route segments for smallest district: {test_district} ({size} boards)")
        
        # Get district data
        district_data = data_loader.get_district_data(test_district)
        
        # Optimize this district with route segments
        result = optimizer.optimize_district(district_data)
        
        print(f"Optimization successful!")
        print(f"Distance: {result['distance']:.2f}m")
        print(f"Duration: {result['duration']:.1f}s")
        print(f"Route points: {len(result['locations'])}")
        
        if 'route_segments' in result and result['route_segments']:
            print(f"Route segments generated: {len(result['route_segments'])}")
            for i, segment in enumerate(result['route_segments']):
                print(f"  Segment {i+1}: {len(segment)} coordinates")
        else:
            print("No route segments generated (fallback to straight lines)")
            
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_route_segments()