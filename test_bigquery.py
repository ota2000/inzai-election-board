#!/usr/bin/env python3
"""
Test script to verify BigQuery integration.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from board_route_optimizer.config import Config
from board_route_optimizer.data.loader import DataLoader


def test_bigquery_loading():
    """Test loading data from BigQuery."""
    
    # Create config with BigQuery enabled
    config = Config()
    config.data.use_bigquery = True
    config.data.bigquery_project_id = "pdf-reader-463007"  # 指定されたプロジェクトを使用
    config.data.prefecture = "千葉県"
    config.data.city = "印西市"
    
    # Initialize data loader
    loader = DataLoader(config)
    
    try:
        # Load data
        print("Loading data from BigQuery...")
        poster_boards_df, voting_offices = loader.load_data()
        
        print(f"\nSuccessfully loaded {len(poster_boards_df)} poster boards")
        print(f"Columns: {list(poster_boards_df.columns)}")
        
        # Show sample data
        print("\nSample data (first 5 rows):")
        print(poster_boards_df.head())
        
        # Show unique districts
        districts = loader.get_districts()
        print(f"\nFound {len(districts)} unique districts:")
        for i, district in enumerate(districts[:5]):
            print(f"  - {district}")
        if len(districts) > 5:
            print(f"  ... and {len(districts) - 5} more")
            
        # Test getting data for a specific district
        if districts:
            test_district = districts[0]
            district_data = loader.get_district_data(test_district)
            print(f"\nData for {test_district}:")
            print(f"  - {len(district_data)} poster boards")
            if not district_data.empty:
                print(f"  - First board: {district_data.iloc[0]['設置場所名']} at {district_data.iloc[0]['住所']}")
                
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_bigquery_loading()