#!/usr/bin/env python3
"""
Test script to verify cached BigQuery data loading.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from board_route_optimizer.config import Config
from board_route_optimizer.data.loader import DataLoader


def test_cache():
    """Test loading cached BigQuery data."""
    
    # Create config with cache enabled
    config = Config()
    config.data.use_bigquery = False
    config.data.use_bigquery_cache = True
    
    try:
        # Initialize data loader
        loader = DataLoader(config)
        
        print("Loading data from cache...")
        
        # Load data
        poster_boards_df, voting_offices = loader.load_data()
        
        print(f"Successfully loaded {len(poster_boards_df)} poster boards from cache")
        
        # Show status breakdown
        if 'ステータス' in poster_boards_df.columns:
            status_counts = poster_boards_df['ステータス'].value_counts()
            print("\nOptimization target status breakdown:")
            for status, count in status_counts.items():
                print(f"  {status}: {count}")
        
        # Get done boards
        done_boards = loader.get_done_boards()
        print(f"\nDone boards: {len(done_boards)}")
        
        # Get districts
        districts = loader.get_districts()
        print(f"\nDistricts: {len(districts)}")
        for district in districts[:5]:
            district_data = loader.get_district_data(district)
            print(f"  - {district}: {len(district_data)} boards")
        
        if len(districts) > 5:
            print(f"  ... and {len(districts) - 5} more districts")
        
        print("\n✅ Cache loading test successful!")
        
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_cache()