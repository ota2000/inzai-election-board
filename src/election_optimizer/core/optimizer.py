"""
Main route optimizer implementation.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any
from pathlib import Path

from ..config import Config
from ..data.loader import DataLoader
from ..utils.distance import DistanceCalculator
from .tsp_solver import TSPSolver
from ..export.geojson_exporter import GeoJSONExporter


class RouteOptimizer:
    """Main route optimization engine."""
    
    def __init__(self, config: Config = None):
        """
        Initialize route optimizer.
        
        Args:
            config: Configuration object. If None, uses default config.
        """
        self.config = config or Config()
        self.data_loader = DataLoader(self.config)
        self.distance_calculator = DistanceCalculator(self.config)
        self.tsp_solver = TSPSolver(self.config)
        self.geojson_exporter = GeoJSONExporter(self.config)
        
        # Data storage
        self.poster_boards_df: pd.DataFrame = None
        self.voting_offices: Dict = None
        self.optimization_results: Dict = {}
    
    def load_data(self) -> None:
        """Load and preprocess data."""
        print("Loading data...")
        self.poster_boards_df, self.voting_offices = self.data_loader.load_data()
        print(f"Loaded {len(self.poster_boards_df)} poster board locations")
        print(f"Loaded {len(self.voting_offices)} voting offices")
    
    def optimize_all_districts(self) -> Dict[str, Any]:
        """
        Optimize routes for all districts.
        
        Returns:
            Dictionary containing optimization results for all districts
        """
        if self.poster_boards_df is None:
            self.load_data()
        
        districts = self.data_loader.get_districts()
        results = {}
        
        print(f"\\nOptimizing routes for {len(districts)} districts...")
        print("=" * 60)
        
        for district_name in districts:
            print(f"\\n【{district_name}】Optimizing...")
            
            try:
                district_result = self._optimize_district(district_name)
                results[district_name] = district_result
                
                print(f"  Optimization complete: {len(district_result['locations'])} points")
                print(f"  Total distance: {district_result['distance']/1000:.2f}km")
                print(f"  Estimated time: {district_result['duration']/3600:.1f}hours")
                
            except Exception as e:
                print(f"  Error optimizing {district_name}: {e}")
                continue
        
        self.optimization_results = results
        return results
    
    def _optimize_district(self, district_name: str) -> Dict[str, Any]:
        """
        Optimize route for a single district.
        
        Args:
            district_name: Name of the district to optimize
            
        Returns:
            Dictionary containing optimization results
        """
        district_data = self.data_loader.get_district_data(district_name)
        
        if len(district_data) == 0:
            raise ValueError(f"No data found for district: {district_name}")
        
        # Prepare coordinates (lon, lat format)
        locations = [
            (row['経度'], row['緯度']) 
            for _, row in district_data.iterrows()
        ]
        
        # Calculate distance matrix
        distance_matrix, duration_matrix = self.distance_calculator.calculate_matrix(
            locations, use_api=bool(self.config.api.api_key)
        )
        
        # Solve TSP
        optimized_route, optimized_distance = self.tsp_solver.solve_with_optimal_start(
            distance_matrix
        )
        
        # Calculate total duration
        total_duration = sum(
            duration_matrix[optimized_route[i]][optimized_route[i+1]]
            for i in range(len(optimized_route) - 1)
        )
        
        # Prepare result
        result = {
            'data': district_data,
            'route': optimized_route,
            'distance': optimized_distance,
            'duration': total_duration,
            'locations': [district_data.iloc[i] for i in optimized_route],
            'distance_matrix': distance_matrix.tolist(),
            'duration_matrix': duration_matrix.tolist()
        }
        
        return result
    
    def export_geojson(self, output_path: str = None) -> None:
        """
        Export optimization results to GeoJSON format.
        
        Args:
            output_path: Path to save GeoJSON file. If None, uses config default.
        """
        if not self.optimization_results:
            raise ValueError("No optimization results to export. Run optimize_all_districts() first.")
        
        if output_path is None:
            output_dir = Path(self.config.data.output_directory)
            output_dir.mkdir(parents=True, exist_ok=True)
            output_path = output_dir / self.config.data.output_filename
        
        print(f"\\nExporting GeoJSON data to {output_path}...")
        
        geojson_data = self.geojson_exporter.export(
            self.optimization_results, 
            self.voting_offices,
            self.data_loader
        )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            import json
            json.dump(geojson_data, f, ensure_ascii=False, indent=2)
        
        print(f"GeoJSON export complete: {output_path}")
    
    def get_summary_statistics(self) -> Dict[str, Any]:
        """
        Get summary statistics of optimization results.
        
        Returns:
            Dictionary containing summary statistics
        """
        if not self.optimization_results:
            return {}
        
        total_districts = len(self.optimization_results)
        total_locations = sum(len(r['locations']) for r in self.optimization_results.values())
        total_distance = sum(r['distance'] for r in self.optimization_results.values())
        total_duration = sum(r['duration'] for r in self.optimization_results.values())
        
        return {
            'total_districts': total_districts,
            'total_locations': total_locations,
            'total_distance_km': total_distance / 1000,
            'total_duration_hours': total_duration / 3600,
            'average_distance_per_district_km': (total_distance / 1000) / total_districts if total_districts > 0 else 0,
            'average_duration_per_district_hours': (total_duration / 3600) / total_districts if total_districts > 0 else 0,
            'average_speed_kmh': self.config.optimization.walking_speed_kmh
        }
    
    def print_summary(self) -> None:
        """Print summary of optimization results."""
        stats = self.get_summary_statistics()
        
        if not stats:
            print("No optimization results available.")
            return
        
        print(f"\\n✅ Overall Summary:")
        print(f"  Total districts: {stats['total_districts']}")
        print(f"  Total poster boards: {stats['total_locations']}")
        print(f"  Total route distance: {stats['total_distance_km']:.2f}km")
        print(f"  Total estimated time: {stats['total_duration_hours']:.1f}hours")
        print(f"  Average speed: {stats['average_speed_kmh']}km/h (walking)")
        
        print(f"\\n🎯 Integrated Features:")
        print(f"  ✅ Optimal starting point TSP optimization")
        print(f"  ✅ Walking route calculation (foot-walking)")
        print(f"  ✅ Personal name anonymization")
        print(f"  ✅ Voting office integration")
        print(f"  ✅ Voting office pin generation")
        print(f"  ✅ Board number normalization")