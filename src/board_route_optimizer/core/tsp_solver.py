"""
Traveling Salesman Problem (TSP) solver implementation.
"""

import numpy as np
from typing import List, Tuple
from ..config import Config


class TSPSolver:
    """Solves TSP using nearest neighbor heuristic with 2-opt improvement."""
    
    def __init__(self, config: Config):
        """
        Initialize TSP solver.
        
        Args:
            config: Configuration object
        """
        self.config = config
    
    def solve_with_optimal_start(self, distances: np.ndarray) -> Tuple[List[int], float]:
        """
        Solve TSP by trying all possible starting points.
        
        Args:
            distances: Distance matrix (n x n)
            
        Returns:
            Tuple of (optimal_route, total_distance)
        """
        n = distances.shape[0]
        if n <= 1:
            return list(range(n)), 0.0
        
        best_route = None
        best_distance = float('inf')
        best_start = 0
        
        print(f"  Optimizing with {n} points as starting candidates...")
        
        # Try all starting points
        for start_idx in range(n):
            route, distance = self.solve_from_start(start_idx, distances)
            
            if distance < best_distance:
                best_distance = distance
                best_route = route
                best_start = start_idx
        
        print(f"  Optimal starting point: {best_start + 1}")
        return best_route, best_distance
    
    def solve_from_start(self, start_idx: int, distances: np.ndarray) -> Tuple[List[int], float]:
        """
        Solve TSP from a specific starting point.
        
        Args:
            start_idx: Starting point index
            distances: Distance matrix
            
        Returns:
            Tuple of (route, total_distance)
        """
        n = distances.shape[0]
        
        # Nearest neighbor construction
        route = self._nearest_neighbor_construction(start_idx, distances)
        total_distance = self._calculate_route_distance(route, distances)
        
        # 2-opt improvement
        route, total_distance = self._two_opt_improvement(route, distances, total_distance)
        
        return route, total_distance
    
    def _nearest_neighbor_construction(self, start_idx: int, distances: np.ndarray) -> List[int]:
        """
        Construct initial route using nearest neighbor heuristic.
        
        Args:
            start_idx: Starting point index
            distances: Distance matrix
            
        Returns:
            Initial route
        """
        n = distances.shape[0]
        unvisited = set(range(n))
        current = start_idx
        route = [current]
        unvisited.remove(current)
        
        while unvisited:
            nearest = min(unvisited, key=lambda x: distances[current][x])
            current = nearest
            route.append(current)
            unvisited.remove(current)
        
        return route
    
    def _two_opt_improvement(self, route: List[int], distances: np.ndarray, 
                           initial_distance: float) -> Tuple[List[int], float]:
        """
        Improve route using 2-opt algorithm.
        
        Args:
            route: Initial route
            distances: Distance matrix
            initial_distance: Initial route distance
            
        Returns:
            Tuple of (improved_route, improved_distance)
        """
        current_route = route.copy()
        current_distance = initial_distance
        
        improved = True
        iteration = 0
        max_iterations = min(
            self.config.optimization.max_tsp_iterations,
            len(route) * 2
        )
        
        while improved and iteration < max_iterations:
            improved = False
            iteration += 1
            
            for i in range(1, len(current_route) - 1):
                for j in range(i + 1, len(current_route)):
                    if j - i == 1:
                        continue
                    
                    new_route = current_route.copy()
                    new_route[i:j] = reversed(new_route[i:j])
                    new_distance = self._calculate_route_distance(new_route, distances)
                    
                    improvement = current_distance - new_distance
                    if improvement > self.config.optimization.tsp_improvement_threshold:
                        current_route = new_route
                        current_distance = new_distance
                        improved = True
                        break
                
                if improved:
                    break
        
        return current_route, current_distance
    
    def _calculate_route_distance(self, route: List[int], distances: np.ndarray) -> float:
        """
        Calculate total distance of a route.
        
        Args:
            route: Route as list of point indices
            distances: Distance matrix
            
        Returns:
            Total route distance
        """
        if len(route) <= 1:
            return 0.0
        
        total = 0.0
        for i in range(len(route) - 1):
            total += distances[route[i]][route[i + 1]]
        
        return total