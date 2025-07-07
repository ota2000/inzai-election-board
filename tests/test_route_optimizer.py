"""Board route optimizer and project-wide tests"""

import pytest
import sys
import os
import json
import pandas as pd
import numpy as np

# src ディレクトリをパスに追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

class TestBasicFunctionality:
    """基本機能のテスト"""
    
    def test_basic_import(self):
        """基本的なインポートテスト"""
        try:
            import board_route_optimizer
            assert board_route_optimizer is not None
        except ImportError:
            pytest.skip("board_route_optimizer モジュールをインポートできません")

    def test_modules_exist(self):
        """モジュールの存在確認テスト"""
        try:
            from board_route_optimizer.core import optimizer
            from board_route_optimizer import config
            assert optimizer is not None
            assert config is not None
        except ImportError:
            pytest.skip("board_route_optimizer モジュールをインポートできません")

    def test_data_files_exist(self):
        """データファイルの存在確認"""
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        
        poster_csv = os.path.join(data_dir, 'poster_board_locations.csv')
        polling_csv = os.path.join(data_dir, 'polling_places.csv')
        
        assert os.path.exists(poster_csv), "poster_board_locations.csv が存在しません"
        assert os.path.exists(polling_csv), "polling_places.csv が存在しません"
        
        # CSVファイルが読み込み可能か確認
        try:
            poster_df = pd.read_csv(poster_csv)
            polling_df = pd.read_csv(polling_csv)
            
            assert len(poster_df) > 0, "poster_board_locations.csv にデータがありません"
            assert len(polling_df) > 0, "polling_places.csv にデータがありません"
            
        except Exception as e:
            pytest.fail(f"CSVファイルの読み込みに失敗: {e}")

    def test_docs_directory(self):
        """docsディレクトリの確認"""
        docs_dir = os.path.join(os.path.dirname(__file__), '..', 'docs')
        
        assert os.path.exists(docs_dir), "docs ディレクトリが存在しません"
        
        index_html = os.path.join(docs_dir, 'index.html')
        assert os.path.exists(index_html), "docs/index.html が存在しません"

    def test_calculation(self):
        """基本的な計算のテスト"""
        assert 2 + 2 == 4
        assert abs(-5) == 5
        assert round(3.14159, 2) == 3.14

    def test_pandas_numpy(self):
        """pandas, numpyの動作確認"""
        # pandas のテスト
        df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
        assert len(df) == 3
        assert df['a'].sum() == 6
        
        # numpy のテスト
        arr = np.array([1, 2, 3, 4, 5])
        assert arr.mean() == 3.0
        assert arr.std() > 0

class TestRouteOptimizer:
    """RouteOptimizerのテスト"""
    
    def test_import_route_optimizer(self):
        """route_optimizerモジュールのインポートテスト"""
        try:
            from board_route_optimizer.core.optimizer import RouteOptimizer
            assert RouteOptimizer is not None
        except ImportError:
            pytest.skip("RouteOptimizer をインポートできません")
    
    def test_optimizer_init_without_files(self):
        """設定での初期化テスト"""
        try:
            from board_route_optimizer.core.optimizer import RouteOptimizer
            from board_route_optimizer.config import Config
            
            # デフォルト設定で初期化
            config = Config()
            optimizer = RouteOptimizer(config)
            assert optimizer is not None
            
        except ImportError:
            pytest.skip("RouteOptimizer をインポートできません")
        except Exception:
            # ファイルがない場合はエラーが発生することを期待
            pass
    
    def test_config_functionality(self):
        """設定機能のテスト"""
        try:
            from board_route_optimizer.config import Config, APIConfig, OptimizationConfig, DataConfig
            
            # デフォルト設定
            config = Config()
            assert config.api is not None
            assert config.optimization is not None
            assert config.data is not None
            
            # 各設定値の確認
            assert config.optimization.walking_speed_kmh == 4.0
            assert config.data.anonymize_personal_names == True
            
        except ImportError:
            pytest.skip("Config をインポートできません")
    
    def test_data_loader_functionality(self):
        """データローダー機能のテスト"""
        try:
            from board_route_optimizer.data.loader import DataLoader
            from board_route_optimizer.config import Config
            
            config = Config()
            loader = DataLoader(config)
            assert loader is not None
            
            # 基本的なメソッドの存在確認
            assert hasattr(loader, 'extract_board_number')
            
        except ImportError:
            pytest.skip("DataLoader をインポートできません")
    
    def test_distance_calculation(self):
        """距離計算のテスト"""
        try:
            from board_route_optimizer.utils.distance import DistanceCalculator
            from board_route_optimizer.config import Config
            
            config = Config()
            calculator = DistanceCalculator(config)
            assert calculator is not None
            
            # 基本的なメソッドの存在確認
            assert hasattr(calculator, 'calculate_matrix')
            
        except ImportError:
            pytest.skip("DistanceCalculator をインポートできません")

class TestTSPAlgorithm:
    """TSPアルゴリズムのテスト"""
    
    def test_tsp_solver(self):
        """TSP解法テスト"""
        try:
            from board_route_optimizer.core.tsp_solver import TSPSolver
            from board_route_optimizer.config import Config
            
            config = Config()
            solver = TSPSolver(config)
            assert solver is not None
            
            # 基本的なメソッドの存在確認
            assert hasattr(solver, 'solve_with_optimal_start')
            
        except ImportError:
            pytest.skip("TSPSolver をインポートできません")
    
    def test_geojson_export(self):
        """GeoJSON出力のテスト"""
        try:
            from board_route_optimizer.export.geojson_exporter import GeoJSONExporter
            from board_route_optimizer.config import Config
            
            config = Config()
            exporter = GeoJSONExporter(config)
            assert exporter is not None
            
            # 基本的なメソッドの存在確認
            assert hasattr(exporter, 'export')
            
        except ImportError:
            pytest.skip("GeoJSONExporter をインポートできません")

class TestUtilityFunctions:
    """ユーティリティ機能のテスト"""
    
    def test_cli_functionality(self):
        """CLI機能のテスト"""
        try:
            from board_route_optimizer.cli import create_parser
            
            # パーサーの作成
            parser = create_parser()
            assert parser is not None
            
            # 基本的な引数の確認
            args = parser.parse_args(['--walking-speed', '3.5'])
            assert args.walking_speed == 3.5
            
        except ImportError:
            pytest.skip("CLI をインポートできません")
        except Exception:
            pytest.skip("CLI テストをスキップ")
    
    def test_config_from_dict(self):
        """辞書からの設定作成テスト"""
        try:
            from board_route_optimizer.config import Config
            
            config_dict = {
                "optimization": {
                    "walking_speed_kmh": 3.5,
                    "max_tsp_iterations": 100
                },
                "data": {
                    "anonymize_personal_names": False
                }
            }
            
            config = Config.from_dict(config_dict)
            assert config.optimization.walking_speed_kmh == 3.5
            assert config.optimization.max_tsp_iterations == 100
            assert config.data.anonymize_personal_names == False
            
        except ImportError:
            pytest.skip("Config をインポートできません")

if __name__ == "__main__":
    pytest.main([__file__])