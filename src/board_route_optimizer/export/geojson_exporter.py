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
        Export optimization results to GeoJSON format.
        
        Args:
            results: Optimization results dictionary
            voting_offices: Voting offices data
            data_loader: Data loader instance for board number extraction
            
        Returns:
            GeoJSON feature collection
        """
        features = []
        
        for district_name, result in results.items():
            print(f"\\n【{district_name}】Generating integrated data...")
            
            # Get voting office info
            office_info = voting_offices.get(district_name, {})
            
            # Add poster board points
            features.extend(self._create_poster_board_features(
                district_name, result, office_info, data_loader
            ))
            
            # Add route segments
            features.extend(self._create_route_features(
                district_name, result
            ))
            
            # Add voting office pin
            if district_name in voting_offices:
                features.append(self._create_voting_office_feature(
                    district_name, result, voting_offices[district_name]
                ))
        
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
            board_number = data_loader.extract_board_number(location['投票区'])
            
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
                    "office_name": district_name,
                    "office_address": office_info.get('address', ''),
                    "district_number": office_info.get('district_number', '')
                }
            }
            features.append(feature)
        
        return features
    
    def _create_route_features(self, district_name: str, result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create GeoJSON features for routes."""
        features = []
        
        # Create simple route (fallback)
        route_coords = [
            [loc['経度'], loc['緯度']] for loc in result['locations']
        ]
        
        if len(route_coords) > 1:
            simple_route_feature = {
                "type": "Feature", 
                "geometry": {
                    "type": "LineString",
                    "coordinates": route_coords
                },
                "properties": {
                    "district": district_name,
                    "type": "simple_route",
                    "total_distance_km": round(result['distance'] / 1000, 2),
                    "estimated_hours": round(result['duration'] / 3600, 1)
                }
            }
            features.append(simple_route_feature)
        
        return features
    
    def _create_voting_office_feature(self, district_name: str, result: Dict[str, Any],
                                    office_data: Dict) -> Dict[str, Any]:
        """Create GeoJSON feature for voting office."""
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point", 
                "coordinates": [office_data['lon'], office_data['lat']]
            },
            "properties": {
                "district": district_name,
                "type": "voting_office",
                "name": district_name,
                "address": office_data['address'],
                "district_number": office_data['district_number'],
                "office_name": district_name,
                "office_address": office_data['address'],
                "total_points": len(result['locations']),
                "total_distance_km": round(result['distance'] / 1000, 2),
                "estimated_hours": round(result['duration'] / 3600, 1)
            }
        }