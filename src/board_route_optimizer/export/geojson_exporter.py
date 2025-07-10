"""
GeoJSON export functionality.
"""

import json
from typing import Dict, List, Any
from ..config import Config


class GeoJSONExporter:
    """Exports optimization results to GeoJSON format."""
    
    def __init__(self, config: Config):
        """
        Initialize GeoJSON exporter.
        
        Args:
            config: Configuration object
        """
        self.config = config
    
    def export(self, results: Dict[str, Any], voting_offices: Dict, 
               data_loader) -> Dict[str, Any]:
        """
        Export optimization results as points only (no route segments).
        Suitable for Google Maps display.
        
        Args:
            results: Optimization results dictionary
            voting_offices: Voting offices data
            data_loader: Data loader instance for board number extraction
            
        Returns:
            GeoJSON feature collection with points only
        """
        features = []
        
        for district_name, result in results.items():
            print(f"\\n【{district_name}】Generating point data...")
            
            # Get voting office info
            office_info = voting_offices.get(district_name, {})
            
            # Add poster board points only
            features.extend(self._create_poster_board_features(
                district_name, result, office_info, data_loader
            ))
        
        # Add done boards as reference points
        done_boards = data_loader.get_done_boards()
        if not done_boards.empty:
            print(f"\\nAdding {len(done_boards)} completed boards as reference points...")
            features.extend(self._create_done_board_features(done_boards, data_loader))
        
        return {
            "type": "FeatureCollection",
            "features": features
        }
    
    def _create_poster_board_features(self, district_name: str, result: Dict[str, Any],
                                    office_info: Dict, data_loader) -> List[Dict[str, Any]]:
        """Create GeoJSON features for poster boards."""
        features = []
        
        for i, location in enumerate(result['locations']):
            # Extract board number
            if '掲示板番号' in location:
                # BigQuery data has board number directly
                board_number = location['掲示板番号']
            else:
                # CSV data needs extraction
                board_number = data_loader.extract_board_number(location['投票区'])
            
            # Get district number as integer
            if '投票区番号' in location:
                # BigQuery data has voting district number
                district_number = int(location['投票区番号'])
            else:
                # Extract from district name (e.g., "第5投票区" -> 5)
                import re
                match = re.search(r'第(\d+)投票区', district_name)
                district_number = int(match.group(1)) if match else 0
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [location['経度'], location['緯度']]
                },
                "properties": {
                    "district": district_name,
                    "order": i + 1,
                    "name": location['設置場所名'],
                    "address": location['住所'],
                    "board_number": board_number,
                    "total_points": len(result['locations']),
                    "total_distance_km": round(result['distance'] / 1000, 2),
                    "estimated_hours": round(result['duration'] / 3600, 1),
                    "district_number": district_number,
                    "status": location.get('ステータス', 'unknown')
                }
            }
            features.append(feature)
        
        return features
    
    
    def _create_done_board_features(self, done_boards, data_loader) -> List[Dict[str, Any]]:
        """Create GeoJSON features for completed (done) boards."""
        features = []
        
        for _, board in done_boards.iterrows():
            # Extract board number
            board_number = board.get('掲示板番号', '')
            
            # Get district number as integer
            district_number = int(board['投票区番号']) if '投票区番号' in board else 0
            district_name = board.get('投票区名', f"第{district_number}投票区")
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [board['経度'], board['緯度']]
                },
                "properties": {
                    "district": district_name,
                    "order": 0,  # Done boards don't have route order
                    "name": board['設置場所名'],
                    "address": board['住所'],
                    "board_number": board_number,
                    "district_number": district_number,
                    "status": "done",
                    "type": "completed_board"
                }
            }
            features.append(feature)
        
        return features