"""
Distance calculation utilities.
"""

import numpy as np
import requests
import time
from typing import List, Tuple, Optional
from geopy.distance import geodesic

from ..config import Config


class DistanceCalculator:
    """Calculates distances between points using various methods."""
    
    def __init__(self, config: Config):
        """
        Initialize distance calculator.
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.last_request_time = 0
    
    def calculate_matrix(self, locations: List[Tuple[float, float]], 
                        use_api: bool = True) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculate distance and duration matrix between locations.
        
        Args:
            locations: List of (lon, lat) coordinates
            use_api: Whether to use API for road distances
            
        Returns:
            Tuple of (distance_matrix, duration_matrix)
        """
        if use_api and self.config.api.api_key:
            try:
                return self._get_road_distance_matrix(locations)
            except Exception as e:
                print(f"API error: {e}")
                print("Falling back to straight-line distances.")
        
        return self._calculate_straight_distance_matrix(locations)
    
    def _get_road_distance_matrix(self, locations: List[Tuple[float, float]]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Get road distance matrix using OpenRouteService API.
        
        Args:
            locations: List of (lon, lat) coordinates
            
        Returns:
            Tuple of (distance_matrix, duration_matrix)
        """
        self._wait_for_rate_limit()
        
        url = f"{self.config.api.openrouteservice_base_url}/matrix/foot-walking"
        headers = {
            'Authorization': self.config.api.api_key,
            'Content-Type': 'application/json'
        }
        
        coordinates = [[loc[0], loc[1]] for loc in locations]
        data = {
            'locations': coordinates,
            'metrics': ['distance', 'duration']
        }
        
        response = requests.post(
            url, 
            json=data, 
            headers=headers, 
            timeout=self.config.api.timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            distances = np.array(result['distances'])
            durations = np.array(result['durations'])
            print(f"Road distance matrix obtained ({len(locations)} points)")
            return distances, durations
        else:
            raise Exception(f"HTTP {response.status_code}: {response.text}")
    
    def _calculate_straight_distance_matrix(self, locations: List[Tuple[float, float]]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculate straight-line distance matrix.
        
        Args:
            locations: List of (lon, lat) coordinates
            
        Returns:
            Tuple of (distance_matrix, duration_matrix)
        """
        n = len(locations)
        distances = np.zeros((n, n))
        durations = np.zeros((n, n))
        
        for i in range(n):
            for j in range(i + 1, n):
                coord1 = (locations[i][1], locations[i][0])  # (lat, lon)
                coord2 = (locations[j][1], locations[j][0])  # (lat, lon)
                
                dist = geodesic(coord1, coord2).meters
                # Estimate duration based on walking speed
                duration = dist / self.config.optimization.walking_speed_ms
                
                distances[i][j] = dist
                distances[j][i] = dist
                durations[i][j] = duration
                durations[j][i] = duration
        
        return distances, durations
    
    def _wait_for_rate_limit(self) -> None:
        """Wait for rate limit if necessary."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.config.api.request_delay:
            time.sleep(self.config.api.request_delay - elapsed)
        self.last_request_time = time.time()