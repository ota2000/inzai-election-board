"""
Distance calculation utilities.
"""

import numpy as np
import requests
import time
from typing import List, Tuple, Optional
from geopy.distance import geodesic
import json
import hashlib
from pathlib import Path

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
        self.route_cache_dir = Path("docs/data/route_cache")
        self.route_cache_dir.mkdir(parents=True, exist_ok=True)
    
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
    
    def get_route_segments(self, locations: List[Tuple[float, float]], 
                          route: List[int]) -> List[List[List[float]]]:
        """
        Get detailed route segments for optimized route.
        
        Args:
            locations: List of (lon, lat) coordinates
            route: Optimized route order
            
        Returns:
            List of route segments as coordinates
        """
        if not self.config.api.api_key:
            return []
        
        segments = []
        total_segments = len(route) - 1
        
        print(f"  Getting {total_segments} route segments...")
        
        cache_hits = 0
        api_calls = 0
        
        for i in range(total_segments):
            from_idx = route[i]
            to_idx = route[i + 1]
            
            print(f"    Segment {i+1}/{total_segments}: {from_idx+1} -> {to_idx+1}")
            
            try:
                # Check if we can use cache before calling API
                cached_forward = self._load_cached_segment(locations[from_idx], locations[to_idx])
                cached_reverse = self._load_cached_segment(locations[to_idx], locations[from_idx])
                
                if cached_forward or cached_reverse:
                    cache_hits += 1
                else:
                    api_calls += 1
                
                segment = self._get_route_segment(
                    locations[from_idx], 
                    locations[to_idx]
                )
                if segment:
                    segments.append(segment)
                else:
                    # Fallback to straight line
                    segments.append([
                        [locations[from_idx][0], locations[from_idx][1]],
                        [locations[to_idx][0], locations[to_idx][1]]
                    ])
            except Exception as e:
                print(f"    Failed to get segment {i+1}: {e}")
                # Fallback to straight line
                segments.append([
                    [locations[from_idx][0], locations[from_idx][1]],
                    [locations[to_idx][0], locations[to_idx][1]]
                ])
        
        print(f"  Route segments completed: {len(segments)}/{total_segments} (Cache hits: {cache_hits}, API calls: {api_calls})")
        return segments
    
    def _get_route_cache_key(self, from_loc: Tuple[float, float], 
                           to_loc: Tuple[float, float]) -> str:
        """
        Generate cache key for route segment.
        
        Args:
            from_loc: Starting location
            to_loc: Ending location
            
        Returns:
            Cache key string
        """
        # Round coordinates to avoid minor precision differences
        from_rounded = (round(from_loc[0], 6), round(from_loc[1], 6))
        to_rounded = (round(to_loc[0], 6), round(to_loc[1], 6))
        
        # Create hash from coordinates
        coord_str = f"{from_rounded}_{to_rounded}"
        return hashlib.md5(coord_str.encode()).hexdigest()
    
    def _load_cached_segment(self, from_loc: Tuple[float, float], 
                           to_loc: Tuple[float, float]) -> Optional[List[List[float]]]:
        """
        Load route segment from cache.
        
        Args:
            from_loc: Starting location
            to_loc: Ending location
            
        Returns:
            Cached route segment or None if not found
        """
        cache_key = self._get_route_cache_key(from_loc, to_loc)
        cache_file = self.route_cache_dir / f"{cache_key}.json"
        
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                    return data['coordinates']
            except Exception as e:
                print(f"    Failed to load cache for {cache_key}: {e}")
        
        return None
    
    def _save_cached_segment(self, from_loc: Tuple[float, float], 
                           to_loc: Tuple[float, float], 
                           coordinates: List[List[float]]) -> None:
        """
        Save route segment to cache.
        
        Args:
            from_loc: Starting location
            to_loc: Ending location
            coordinates: Route coordinates
        """
        cache_key = self._get_route_cache_key(from_loc, to_loc)
        cache_file = self.route_cache_dir / f"{cache_key}.json"
        
        try:
            data = {
                'from_loc': from_loc,
                'to_loc': to_loc,
                'coordinates': coordinates,
                'cached_at': time.time()
            }
            with open(cache_file, 'w') as f:
                json.dump(data, f)
        except Exception as e:
            print(f"    Failed to save cache for {cache_key}: {e}")
    
    def _get_route_segment(self, from_loc: Tuple[float, float], 
                          to_loc: Tuple[float, float]) -> Optional[List[List[float]]]:
        """
        Get route segment between two points with caching.
        
        Args:
            from_loc: (lon, lat) of starting point
            to_loc: (lon, lat) of ending point
            
        Returns:
            List of coordinates for the route segment
        """
        # Try to load from cache first
        cached_segment = self._load_cached_segment(from_loc, to_loc)
        if cached_segment:
            print(f"      Using cached segment")
            return cached_segment
        
        # Also try reverse direction (routes are bidirectional)
        cached_reverse = self._load_cached_segment(to_loc, from_loc)
        if cached_reverse:
            print(f"      Using cached segment (reversed)")
            # Reverse the coordinates
            return list(reversed(cached_reverse))
        
        print(f"      Fetching from API...")
        self._wait_for_rate_limit()
        
        url = f"{self.config.api.openrouteservice_base_url}/directions/foot-walking/geojson"
        headers = {
            'Authorization': self.config.api.api_key,
            'Content-Type': 'application/json'
        }
        
        data = {
            'coordinates': [
                [from_loc[0], from_loc[1]],
                [to_loc[0], to_loc[1]]
            ]
        }
        
        response = requests.post(
            url, 
            json=data, 
            headers=headers, 
            timeout=self.config.api.timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            if 'features' in result and len(result['features']) > 0:
                geometry = result['features'][0]['geometry']
                if geometry['type'] == 'LineString':
                    coordinates = geometry['coordinates']
                    # Save to cache
                    self._save_cached_segment(from_loc, to_loc, coordinates)
                    return coordinates
        
        return None
    
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