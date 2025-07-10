#!/usr/bin/env python3
"""
Test script to verify status filtering functionality.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from board_route_optimizer.config import Config
from board_route_optimizer.data.loader import DataLoader


def test_status_filtering():
    """Test loading data with status filtering."""
    
    # Create config with BigQuery enabled
    config = Config()
    config.data.use_bigquery = True
    config.data.bigquery_project_id = "pdf-reader-463007"
    config.data.prefecture = "千葉県"
    config.data.city = "印西市"
    
    # Initialize data loader
    loader = DataLoader(config)
    
    try:
        # Load data
        print("Loading data from BigQuery with status filtering...")
        poster_boards_df, voting_offices = loader.load_data()
        
        print(f"\nOptimization targets: {len(poster_boards_df)} boards")
        
        # Show status distribution for optimization targets
        if 'ステータス' in poster_boards_df.columns:
            status_counts = poster_boards_df['ステータス'].value_counts()
            print("\nStatus distribution in optimization data:")
            for status, count in status_counts.items():
                print(f"  {status}: {count}")
        
        # Get done boards (reference data)
        done_boards = loader.get_done_boards()
        print(f"\nReference data (done): {len(done_boards)} boards")
        
        if len(done_boards) > 0:
            print("Sample done boards:")
            for i, row in done_boards.head(3).iterrows():
                print(f"  - {row['設置場所名']} ({row['投票区名']}) - Status: {row['ステータス']}")
        
        # Show districts for optimization
        districts = loader.get_districts()
        print(f"\nDistricts available for optimization: {len(districts)}")
        for district in districts[:5]:
            district_data = loader.get_district_data(district)
            print(f"  - {district}: {len(district_data)} boards")
        
        if len(districts) > 5:
            print(f"  ... and {len(districts) - 5} more districts")
            
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_status_filtering()