"""
Data loading and preprocessing module.
"""

import pandas as pd
import numpy as np
import re
import os
from typing import Dict, List, Tuple, Optional
from pathlib import Path

from ..config import Config
from .bigquery_loader import BigQueryLoader


class DataLoader:
    """Handles loading and preprocessing of poster board and polling place data."""
    
    def __init__(self, config: Config):
        """
        Initialize the data loader.
        
        Args:
            config: Configuration object with data settings
        """
        self.config = config
        self.poster_boards_df: Optional[pd.DataFrame] = None
        self.polling_places_df: Optional[pd.DataFrame] = None
        self.voting_offices: Dict = {}
    
    def load_data(self) -> Tuple[pd.DataFrame, Dict]:
        """
        Load poster board and polling place data.
        
        Returns:
            Tuple of (poster_boards_dataframe, voting_offices_dict)
            
        Raises:
            FileNotFoundError: If required data files are not found
            ValueError: If data format is invalid
        """
        # Check if we should use BigQuery, cached data, or CSV
        if self.config.data.use_bigquery_cache:
            # Load from cached BigQuery data
            bigquery_loader = BigQueryLoader(
                project_id=self.config.data.bigquery_project_id,
                dataset_id=self.config.data.bigquery_dataset_id,
                table_id=self.config.data.bigquery_table_id
            )
            # Load from cache and apply filtering
            cached_df = bigquery_loader.load_from_csv()
            self.poster_boards_df = self._apply_bigquery_filtering(cached_df, bigquery_loader)
            self.bigquery_loader = bigquery_loader
        elif self.config.data.use_bigquery:
            # Load from BigQuery
            bigquery_loader = BigQueryLoader(
                project_id=self.config.data.bigquery_project_id,
                dataset_id=self.config.data.bigquery_dataset_id,
                table_id=self.config.data.bigquery_table_id
            )
            self.poster_boards_df = bigquery_loader.load_poster_boards(
                prefecture=self.config.data.prefecture,
                city=self.config.data.city,
                exclude_done=True  # doneステータスの地点を最適化から除外
            )
            # BigQueryLoaderインスタンスを保存してdone_boardsにアクセス可能にする
            self.bigquery_loader = bigquery_loader
        else:
            # Load poster board data from CSV
            poster_path = Path(self.config.data.poster_board_csv)
            if not poster_path.exists():
                raise FileNotFoundError(f"Poster board data not found: {poster_path}")
            
            self.poster_boards_df = pd.read_csv(poster_path)
        
        self._validate_poster_board_data()
        
        # Load polling place data (still from CSV for now)
        polling_path = Path(self.config.data.polling_places_csv)
        if polling_path.exists():
            self.polling_places_df = pd.read_csv(polling_path)
            self.voting_offices = self._process_voting_offices()
        else:
            print(f"Warning: {polling_path} not found. Running without polling place data.")
            self.voting_offices = {}
        
        # Preprocess data
        self._preprocess_poster_board_data()
        
        return self.poster_boards_df, self.voting_offices
    
    def _validate_poster_board_data(self) -> None:
        """Validate required columns in poster board data."""
        required_columns = ['投票区', '設置場所名', '住所', '緯度', '経度']
        missing_columns = [col for col in required_columns if col not in self.poster_boards_df.columns]
        
        if missing_columns:
            raise ValueError(f"Missing required columns in poster board data: {missing_columns}")
        
        # Check for null values in critical columns
        for col in ['緯度', '経度']:
            if self.poster_boards_df[col].isnull().any():
                raise ValueError(f"Null values found in column: {col}")
    
    def _process_voting_offices(self) -> Dict:
        """Process polling place data into voting offices dictionary."""
        voting_offices = {}
        
        for _, row in self.polling_places_df.iterrows():
            voting_offices[row['polling_place_name']] = {
                'address': row['address'],
                'district_number': row['district_number'],
                'lat': row['latitude'],
                'lon': row['longitude']
            }
        
        return voting_offices
    
    def _preprocess_poster_board_data(self) -> None:
        """Preprocess poster board data."""
        # Extract district names based on data source
        if self.config.data.use_bigquery:
            # For BigQuery data, create district name from voting_district_number
            self.poster_boards_df['投票区名'] = self.poster_boards_df['投票区番号'].apply(
                lambda x: f"第{x}投票区"
            )
        else:
            # For CSV data, extract from the original format
            self.poster_boards_df['投票区名'] = self.poster_boards_df['投票区'].str.extract(r': (.+)$')[0]
        
        # Anonymize personal names if enabled
        if self.config.data.anonymize_personal_names:
            self.poster_boards_df['設置場所名'] = self.poster_boards_df['設置場所名'].apply(
                self._sanitize_location_name
            )
    
    def _sanitize_location_name(self, name: str) -> str:
        """
        Sanitize location names by replacing personal residence references.
        
        Args:
            name: Original location name
            
        Returns:
            Sanitized location name
        """
        if not name or pd.isna(name):
            return name
        
        sanitized_name = str(name)
        
        # Apply personal name patterns
        for pattern in self.config.data.personal_name_patterns:
            if re.search(pattern, sanitized_name):
                # Extract the suffix (前, 脇, etc.)
                suffix_match = re.search(r'宅(前|脇|裏|隣|横|側)', sanitized_name)
                if suffix_match:
                    suffix = suffix_match.group(1)
                    sanitized_name = f"個人宅{suffix}"
                else:
                    sanitized_name = "個人宅"
                break
        
        return sanitized_name
    
    def extract_board_number(self, voting_area: str) -> str:
        """
        Extract board number from voting area string or board number directly.
        
        Args:
            voting_area: Voting area identifier or board number (e.g., "第1投票区ー1" or "1-1")
            
        Returns:
            Formatted board number (e.g., "1-1")
        """
        # If data comes from BigQuery, check if we have board number column
        if hasattr(self, 'poster_boards_df') and '掲示板番号' in self.poster_boards_df.columns:
            # For BigQuery data, board number is already in the correct format
            row = self.poster_boards_df[self.poster_boards_df['投票区'] == voting_area]
            if not row.empty:
                return str(row.iloc[0]['掲示板番号'])
        
        # Original CSV format extraction
        try:
            match = re.search(r'第([０-９\d]+)投票区ー([０-９\d]+)', voting_area)
            if match:
                district_num = match.group(1)
                board_num = match.group(2)
                
                # Convert full-width to half-width numbers
                district_num = district_num.translate(str.maketrans('０１２３４５６７８９', '0123456789'))
                board_num = board_num.translate(str.maketrans('０１２３４５６７８９', '0123456789'))
                
                # Remove leading zeros
                district_num = str(int(district_num))
                board_num = str(int(board_num))
                
                return f"{district_num}-{board_num}"
        except Exception:
            pass
        
        return ""
    
    def get_districts(self) -> List[str]:
        """
        Get list of all districts.
        
        Returns:
            List of district names
        """
        if self.poster_boards_df is None:
            raise ValueError("Data not loaded. Call load_data() first.")
        
        return self.poster_boards_df['投票区名'].unique().tolist()
    
    def get_district_data(self, district_name: str) -> pd.DataFrame:
        """
        Get data for a specific district.
        
        Args:
            district_name: Name of the district
            
        Returns:
            DataFrame containing district data
        """
        if self.poster_boards_df is None:
            raise ValueError("Data not loaded. Call load_data() first.")
        
        return self.poster_boards_df[
            self.poster_boards_df['投票区名'] == district_name
        ].reset_index(drop=True)
    
    def get_done_boards(self) -> pd.DataFrame:
        """
        Get boards with 'done' status (reference data).
        
        Returns:
            DataFrame containing done boards, or empty DataFrame if not available
        """
        if hasattr(self, 'bigquery_loader') and self.bigquery_loader.done_boards is not None:
            return self.bigquery_loader.done_boards
        return pd.DataFrame()
    
    def _apply_bigquery_filtering(self, df: pd.DataFrame, bigquery_loader: BigQueryLoader) -> pd.DataFrame:
        """
        Apply BigQuery filtering to cached data.
        
        Args:
            df: Full cached DataFrame
            bigquery_loader: BigQuery loader instance
            
        Returns:
            Filtered DataFrame for optimization
        """
        # Split data into optimization targets and reference data
        done_boards = df[df['ステータス'] == 'done'].copy()
        optimization_boards = df[df['ステータス'] != 'done'].copy()
        
        print(f"Loaded {len(df)} total boards from cache: {len(optimization_boards)} for optimization, {len(done_boards)} completed (reference only)")
        
        # Store done boards for reference
        bigquery_loader.done_boards = done_boards
        
        return optimization_boards