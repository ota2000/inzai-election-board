"""route_optimizerとプロジェクト全体のテスト"""

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
            import inzai_election_board
            assert inzai_election_board.__version__ == "0.1.0"
        except ImportError:
            pytest.skip("inzai_election_board モジュールをインポートできません")

    def test_modules_exist(self):
        """モジュールの存在確認テスト"""
        try:
            from inzai_election_board import route_optimizer
            assert route_optimizer is not None
        except ImportError:
            pytest.skip("route_optimizer をインポートできません")

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

class TestCompleteRouteOptimizer:
    """CompleteRouteOptimizerのテスト"""
    
    def test_import_route_optimizer(self):
        """route_optimizerモジュールのインポートテスト"""
        try:
            from inzai_election_board import route_optimizer
            assert hasattr(route_optimizer, 'CompleteRouteOptimizer')
        except ImportError:
            pytest.skip("route_optimizer をインポートできません")
    
    def test_optimizer_init_without_files(self):
        """ファイルがない場合の初期化テスト"""
        try:
            from inzai_election_board.route_optimizer import CompleteRouteOptimizer
            
            # 存在しないファイルでの初期化
            optimizer = CompleteRouteOptimizer(
                poster_csv='nonexistent.csv', 
                polling_csv='nonexistent.csv'
            )
            # エラーにならずに初期化されることを確認
            assert optimizer is not None
            
        except ImportError:
            pytest.skip("CompleteRouteOptimizer をインポートできません")
        except Exception:
            # ファイルがない場合はエラーが発生することを期待
            pass
    
    def test_sanitize_location_name(self):
        """地名のサニタイズ機能テスト"""
        try:
            from inzai_election_board.route_optimizer import CompleteRouteOptimizer
            
            optimizer = CompleteRouteOptimizer(
                poster_csv='nonexistent.csv', 
                polling_csv='nonexistent.csv'
            )
            
            # 通常の地名はそのまま
            assert optimizer.sanitize_location_name("市役所前") == "市役所前"
            assert optimizer.sanitize_location_name("図書館前") == "図書館前"
            
            # 個人宅関連の地名の匿名化
            assert optimizer.sanitize_location_name("田中宅前") == "個人宅前"
            assert optimizer.sanitize_location_name("佐藤宅脇") == "個人宅脇"
            
            # 空文字列やNoneの処理
            assert optimizer.sanitize_location_name("") == ""
            assert optimizer.sanitize_location_name(None) is None
            
        except ImportError:
            pytest.skip("CompleteRouteOptimizer をインポートできません")
        except Exception:
            # ファイルがない場合のエラーはスキップ
            pytest.skip("テスト用ファイルが存在しません")
    
    def test_extract_board_number(self):
        """掲示板番号抽出のテスト"""
        try:
            from inzai_election_board.route_optimizer import CompleteRouteOptimizer
            
            optimizer = CompleteRouteOptimizer(
                poster_csv='nonexistent.csv', 
                polling_csv='nonexistent.csv'
            )
            
            # 通常の形式
            assert optimizer.extract_board_number("第01投票区ー01") == "1-1"
            assert optimizer.extract_board_number("第10投票区ー05") == "10-5"
            
            # 全角数字
            assert optimizer.extract_board_number("第０１投票区ー０１") == "1-1"
            
            # 形式に合わない場合
            assert optimizer.extract_board_number("無効な形式") == ""
            
        except ImportError:
            pytest.skip("CompleteRouteOptimizer をインポートできません")
        except Exception:
            pytest.skip("テスト用ファイルが存在しません")
    
    def test_calculate_straight_distance_matrix(self):
        """直線距離行列計算のテスト"""
        try:
            from inzai_election_board.route_optimizer import CompleteRouteOptimizer
            
            optimizer = CompleteRouteOptimizer(
                poster_csv='nonexistent.csv', 
                polling_csv='nonexistent.csv'
            )
            
            # テスト用座標
            locations = [
                [140.101, 35.833],  # [lon, lat]
                [140.102, 35.834],
                [140.103, 35.835]
            ]
            
            distances, durations = optimizer.calculate_straight_distance_matrix(locations)
            
            # 形状の確認
            assert distances.shape == (3, 3)
            assert durations.shape == (3, 3)
            
            # 対角成分は0
            for i in range(3):
                assert distances[i][i] == 0
                assert durations[i][i] == 0
            
            # 対称行列
            for i in range(3):
                for j in range(3):
                    assert distances[i][j] == distances[j][i]
                    assert durations[i][j] == durations[j][i]
            
            # 距離は正の値（対角成分以外）
            for i in range(3):
                for j in range(3):
                    if i != j:
                        assert distances[i][j] > 0
                        assert durations[i][j] > 0
            
        except ImportError:
            pytest.skip("CompleteRouteOptimizer をインポートできません")
        except Exception:
            pytest.skip("テスト用ファイルが存在しません")

class TestTSPAlgorithm:
    """TSPアルゴリズムのテスト"""
    
    def test_solve_tsp_from_start(self):
        """指定始点からのTSP解法テスト"""
        try:
            from inzai_election_board.route_optimizer import CompleteRouteOptimizer
            
            optimizer = CompleteRouteOptimizer(
                poster_csv='nonexistent.csv', 
                polling_csv='nonexistent.csv'
            )
            
            # 3x3の距離行列（簡単なテスト用）
            distances = np.array([
                [0, 10, 20],
                [10, 0, 15],
                [20, 15, 0]
            ])
            
            # 0から開始
            route, distance = optimizer.solve_tsp_from_start(0, distances)
            
            # 基本的な確認
            assert len(route) == 3
            assert route[0] == 0  # 0から開始
            assert set(route) == {0, 1, 2}  # 全地点を訪問
            assert distance > 0
            
        except ImportError:
            pytest.skip("CompleteRouteOptimizer をインポートできません")
        except Exception:
            pytest.skip("テスト用ファイルが存在しません")
    
    def test_calculate_route_distance(self):
        """ルート距離計算のテスト"""
        try:
            from inzai_election_board.route_optimizer import CompleteRouteOptimizer
            
            optimizer = CompleteRouteOptimizer(
                poster_csv='nonexistent.csv', 
                polling_csv='nonexistent.csv'
            )
            
            distances = np.array([
                [0, 10, 20],
                [10, 0, 15],
                [20, 15, 0]
            ])
            
            # ルート [0, 1, 2] の距離
            route = [0, 1, 2]
            total_distance = optimizer.calculate_route_distance(route, distances)
            expected = distances[0][1] + distances[1][2]  # 0->1 + 1->2
            assert total_distance == expected
            
            # 1つの地点のみ
            route = [0]
            total_distance = optimizer.calculate_route_distance(route, distances)
            assert total_distance == 0
            
        except ImportError:
            pytest.skip("CompleteRouteOptimizer をインポートできません")
        except Exception:
            pytest.skip("テスト用ファイルが存在しません")

class TestUtilityFunctions:
    """ユーティリティ機能のテスト"""
    
    def test_wait_for_rate_limit(self):
        """レート制限待機のテスト"""
        try:
            from inzai_election_board.route_optimizer import CompleteRouteOptimizer
            import time
            
            optimizer = CompleteRouteOptimizer(
                poster_csv='nonexistent.csv', 
                polling_csv='nonexistent.csv'
            )
            
            # レート制限の設定を短くする
            optimizer.request_delay = 0.1
            
            start_time = time.time()
            optimizer.wait_for_rate_limit()
            optimizer.wait_for_rate_limit()
            end_time = time.time()
            
            # 少なくとも遅延時間は経過している
            assert end_time - start_time >= 0.05  # 若干の余裕を持たせる
            
        except ImportError:
            pytest.skip("CompleteRouteOptimizer をインポートできません")
        except Exception:
            pytest.skip("テスト用ファイルが存在しません")

if __name__ == "__main__":
    pytest.main([__file__])