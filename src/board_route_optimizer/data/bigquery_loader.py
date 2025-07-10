"""
BigQuery data loading module for poster board data.
"""

import os
from typing import Dict, List, Tuple, Optional

import pandas as pd
from google.cloud import bigquery


class BigQueryLoader:
    """Handles loading poster board data from BigQuery."""
    
    def __init__(self, project_id: str = None, dataset_id: str = None, table_id: str = None):
        """
        Initialize BigQuery loader.
        
        Args:
            project_id: GCP project ID (defaults to environment variable)
            dataset_id: BigQuery dataset ID  
            table_id: BigQuery table ID
        """
        self.project_id = project_id or 'pdf-reader-463007'  # デフォルトで指定されたプロジェクトを使用
        self.dataset_id = dataset_id or 'prd_public'
        self.table_id = table_id or 'poster_boards'
        
        # Initialize BigQuery client with user authentication
        self.client = bigquery.Client(project=self.project_id)
        
        # Store for done boards (reference data)
        self.done_boards = None
        
    def get_poster_boards_query(self, prefecture: str = "千葉県", city: str = "印西市") -> str:
        """
        Generate BigQuery query for poster boards data.
        
        Args:
            prefecture: Prefecture name
            city: City name
            
        Returns:
            SQL query string
        """
        query = f"""
        WITH
        __import_poster_boards AS (
          -- Datastreamはat-least-once配信で重複しうるため排除ロジック
          SELECT DISTINCT
            * EXCEPT(datastream_metadata)
          FROM
            `{self.project_id}.{self.dataset_id}.{self.table_id}`
        )
        
        -- 各都道府県・市区町村・掲示板番号の組み合わせで最新の1レコードのみ
        SELECT
          name,
          lat,
          long,
          status,
          CAST(SPLIT(number, '-')[SAFE_OFFSET(0)] AS INT64) AS voting_district_number,
          number,
          address,
        FROM __import_poster_boards
        WHERE prefecture = "{prefecture}"
          AND city = "{city}"
        QUALIFY ROW_NUMBER() OVER (
          PARTITION BY row_number, file_name, prefecture
          ORDER BY updated_at DESC
        ) = 1
        """
        return query
        
    def load_poster_boards(self, prefecture: str = "千葉県", city: str = "印西市", exclude_done: bool = True) -> pd.DataFrame:
        """
        Load poster board data from BigQuery.
        
        Args:
            prefecture: Prefecture name
            city: City name
            exclude_done: If True, exclude boards with status='done' from optimization
            
        Returns:
            DataFrame with poster board data
        """
        query = self.get_poster_boards_query(prefecture, city)
        
        # Execute query and get results as DataFrame
        df = self.client.query(query).to_dataframe()
        
        # Rename columns to match expected format
        df = df.rename(columns={
            'name': '設置場所名',
            'address': '住所', 
            'lat': '緯度',
            'long': '経度',
            'voting_district_number': '投票区番号',
            'number': '掲示板番号',
            'status': 'ステータス'
        })
        
        # Convert Decimal types to float for JSON serialization
        df['緯度'] = df['緯度'].astype(float)
        df['経度'] = df['経度'].astype(float)
        
        # Create 投票区 column in expected format for compatibility
        df['投票区'] = df.apply(
            lambda row: f"第{row['投票区番号']}投票区ー{row['掲示板番号'].split('-')[1] if '-' in str(row['掲示板番号']) else '1'}: 第{row['投票区番号']}投票区",
            axis=1
        )
        
        # Create 投票区名 column for district name
        df['投票区名'] = df['投票区番号'].apply(lambda x: f"第{x}投票区")
        
        # Split data into optimization targets and reference data
        if exclude_done:
            # Keep done boards as reference but exclude from optimization
            done_boards = df[df['ステータス'] == 'done'].copy()
            optimization_boards = df[df['ステータス'] != 'done'].copy()
            
            print(f"Loaded {len(df)} total boards: {len(optimization_boards)} for optimization, {len(done_boards)} completed (reference only)")
            
            # Store done boards for reference (could be used in exports)
            self.done_boards = done_boards
            
            return optimization_boards
        
        return df
    
    def save_to_csv(self, df: pd.DataFrame, output_path: str = "docs/data/bigquery_cache.csv") -> None:
        """
        Save BigQuery data to CSV for caching.
        
        Args:
            df: DataFrame to save
            output_path: Path to save CSV file
        """
        from pathlib import Path
        
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        df.to_csv(output_file, index=False, encoding='utf-8')
        print(f"BigQuery data cached to: {output_file}")
    
    def load_from_csv(self, input_path: str = "docs/data/bigquery_cache.csv") -> pd.DataFrame:
        """
        Load cached BigQuery data from CSV.
        
        Args:
            input_path: Path to CSV file
            
        Returns:
            DataFrame with cached data
        """
        from pathlib import Path
        
        input_file = Path(input_path)
        if not input_file.exists():
            raise FileNotFoundError(f"Cached data not found: {input_file}")
        
        df = pd.read_csv(input_file)
        print(f"Loaded cached BigQuery data from: {input_file}")
        return df