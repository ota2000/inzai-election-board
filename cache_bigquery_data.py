#!/usr/bin/env python3
"""
Cache BigQuery data to CSV for faster development iterations.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from board_route_optimizer.data.bigquery_loader import BigQueryLoader


def cache_bigquery_data():
    """Cache BigQuery data to CSV."""
    
    try:
        # Initialize BigQuery loader
        loader = BigQueryLoader(
            project_id="pdf-reader-463007",
            dataset_id="prd_public",
            table_id="poster_boards"
        )
        
        print("Fetching data from BigQuery...")
        
        # Load all data (without filtering done status)
        df = loader.load_poster_boards(
            prefecture="千葉県",
            city="印西市",
            exclude_done=False  # Get all data including done
        )
        
        print(f"Fetched {len(df)} records from BigQuery")
        
        # Save to CSV
        output_path = "docs/data/bigquery_cache.csv"
        loader.save_to_csv(df, output_path)
        
        # Show status breakdown
        if 'ステータス' in df.columns:
            status_counts = df['ステータス'].value_counts()
            print("\nStatus breakdown:")
            for status, count in status_counts.items():
                print(f"  {status}: {count}")
        
        print(f"\n✅ BigQuery data cached successfully!")
        print(f"Next time, you can use the cached data instead of querying BigQuery.")
        
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    cache_bigquery_data()