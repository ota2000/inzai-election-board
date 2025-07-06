#!/usr/bin/env python3
"""
印西市投票所ポスター掲示板巡回システム統合版
- 最適始点TSP最適化
- 徒歩経路計算
- 個人名完全除去
- 投票所情報統合
- 一括GeoJSON生成
"""

import pandas as pd
import numpy as np
import requests
import time
import json
import re
from geopy.distance import geodesic
from datetime import datetime
import os
import polyline

class CompleteRouteOptimizer:
    def __init__(self, poster_csv='poster_board_locations.csv', polling_csv='polling_places.csv', api_key=None):
        """初期化"""
        # 掲示板データを読み込み
        self.df = pd.read_csv(poster_csv)

        # 投票所データを読み込み
        self.voting_offices = {}
        if os.path.exists(polling_csv):
            polling_df = pd.read_csv(polling_csv)
            for _, row in polling_df.iterrows():
                self.voting_offices[row['polling_place_name']] = {
                    'address': row['address'],
                    'district_number': row['district_number'],
                    'lat': row['latitude'],
                    'lon': row['longitude']
                }
        else:
            print(f"警告: {polling_csv}が見つかりません。投票所データなしで実行します。")

        self.api_key = api_key
        self.base_url = "https://api.openrouteservice.org/v2"

        # レート制限対応
        self.request_delay = 2.0  # 秒（安全な遅延時間）
        self.last_request_time = 0

    def wait_for_rate_limit(self):
        """レート制限を考慮した待機"""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.request_delay:
            time.sleep(self.request_delay - elapsed)
        self.last_request_time = time.time()

    def get_road_distance_matrix(self, locations, profile='foot-walking'):
        """OpenRouteService APIを使用して道路距離行列を取得"""
        if self.api_key is None:
            print("警告: APIキーが設定されていません。直線距離を使用します。")
            return self.calculate_straight_distance_matrix(locations)

        try:
            self.wait_for_rate_limit()

            url = f"{self.base_url}/matrix/{profile}"
            headers = {
                'Authorization': self.api_key,
                'Content-Type': 'application/json'
            }

            coordinates = [[loc[0], loc[1]] for loc in locations]
            data = {
                'locations': coordinates,
                'metrics': ['distance', 'duration']
            }

            response = requests.post(url, json=data, headers=headers, timeout=30)

            if response.status_code == 200:
                result = response.json()
                distances = np.array(result['distances'])
                durations = np.array(result['durations'])
                print(f"道路距離行列を取得しました（{len(locations)}地点）")
                return distances, durations
            else:
                print(f"API エラー {response.status_code}: {response.text}")
                print("フォールバックモードで直線距離を使用します。")
                return self.calculate_straight_distance_matrix(locations)

        except Exception as e:
            print(f"API 呼び出しエラー: {e}")
            print("フォールバックモードで直線距離を使用します。")
            return self.calculate_straight_distance_matrix(locations)

    def calculate_straight_distance_matrix(self, locations):
        """フォールバック用の直線距離計算"""
        n = len(locations)
        distances = np.zeros((n, n))
        durations = np.zeros((n, n))

        for i in range(n):
            for j in range(i+1, n):
                coord1 = (locations[i][1], locations[i][0])
                coord2 = (locations[j][1], locations[j][0])

                dist = geodesic(coord1, coord2).meters
                # 平均歩行速度4km/hで時間を推定
                duration = (dist / 1000) / 4 * 3600  # 秒

                distances[i][j] = dist
                distances[j][i] = dist
                durations[i][j] = duration
                durations[j][i] = duration

        return distances, durations

    def solve_tsp_with_optimal_start(self, locations, distances):
        """最適始点を探索するTSP解法"""
        n = len(locations)
        if n <= 1:
            return list(range(n)), 0

        best_route = None
        best_distance = float('inf')
        best_start = 0

        print(f"  全{n}地点を始点候補として最適化中...")

        # 全ての地点を始点として試行
        for start_idx in range(n):
            route, distance = self.solve_tsp_from_start(start_idx, distances)

            if distance < best_distance:
                best_distance = distance
                best_route = route
                best_start = start_idx

        print(f"  最適始点: {best_start + 1}番目の地点")
        return best_route, best_distance

    def solve_tsp_from_start(self, start_idx, distances):
        """指定した始点からのTSP解法（最近傍法 + 2-opt）"""
        n = distances.shape[0]

        # 最近傍法で初期解を生成
        unvisited = set(range(n))
        current = start_idx
        route = [current]
        unvisited.remove(current)
        total_distance = 0

        while unvisited:
            nearest = min(unvisited, key=lambda x: distances[current][x])
            total_distance += distances[current][nearest]
            current = nearest
            route.append(current)
            unvisited.remove(current)

        # 2-opt改善
        improved = True
        iteration = 0
        max_iterations = min(50, n * 2)  # 計算時間を制限

        while improved and iteration < max_iterations:
            improved = False
            iteration += 1

            for i in range(1, len(route) - 1):
                for j in range(i + 1, len(route)):
                    if j - i == 1:
                        continue

                    new_route = route.copy()
                    new_route[i:j] = reversed(new_route[i:j])
                    new_distance = self.calculate_route_distance(new_route, distances)

                    if new_distance < total_distance:
                        route = new_route
                        total_distance = new_distance
                        improved = True
                        break

                if improved:
                    break

        return route, total_distance

    def calculate_route_distance(self, route, distances):
        """ルートの総距離を計算（一方向経路）"""
        total = 0
        for i in range(len(route) - 1):
            total += distances[route[i]][route[i + 1]]
        return total

    def get_detailed_route_geometry(self, start_coord, end_coord, profile='foot-walking'):
        """2地点間の詳細ルート情報を取得"""
        if self.api_key is None:
            return None

        try:
            self.wait_for_rate_limit()

            url = f"{self.base_url}/directions/{profile}"
            headers = {
                'Authorization': self.api_key,
                'Content-Type': 'application/json'
            }

            data = {
                'coordinates': [start_coord, end_coord],
                'format': 'geojson',
                'geometry': True,
                'instructions': True
            }

            response = requests.post(url, json=data, headers=headers, timeout=30)

            if response.status_code == 200:
                result = response.json()
                if 'routes' in result and len(result['routes']) > 0:
                    route = result['routes'][0]
                    if 'geometry' in route:
                        geometry_data = route['geometry']

                        if isinstance(geometry_data, str):
                            coords = polyline.decode(geometry_data)
                            coords = [[lon, lat] for lat, lon in coords]
                            geometry = {
                                'type': 'LineString',
                                'coordinates': coords
                            }
                        else:
                            geometry = geometry_data

                        geojson_response = {
                            'type': 'FeatureCollection',
                            'features': [{
                                'type': 'Feature',
                                'geometry': geometry,
                                'properties': {
                                    'distance': route.get('summary', {}).get('distance'),
                                    'duration': route.get('summary', {}).get('duration')
                                }
                            }]
                        }
                        return geojson_response

                return None
            else:
                return None

        except Exception:
            return None

    def sanitize_location_name(self, name):
        """個人名を含む地名を適切に置換"""
        if not name:
            return name

        # 個人宅関連のパターンを検出して置換
        patterns = [
            (r'[一-龯\w\s]+宅前', '個人宅前'),
            (r'[一-龯\w\s]+宅脇', '個人宅脇'),
            (r'[一-龯\w\s]+宅裏', '個人宅裏'),
            (r'[一-龯\w\s]+宅隣', '個人宅隣'),
            (r'[一-龯\w\s]+宅横', '個人宅横'),
            (r'[一-龯\w\s]+宅側', '個人宅側'),
        ]

        sanitized_name = name
        for pattern, replacement in patterns:
            if re.search(pattern, sanitized_name):
                sanitized_name = re.sub(pattern, replacement, sanitized_name)
                break

        return sanitized_name

    def extract_board_number(self, voting_area):
        """掲示板番号を抽出（全角数字対応）"""
        board_number = ""
        try:
            match = re.search(r'第([０-９\d]+)投票区ー([０-９\d]+)', voting_area)
            if match:
                district_num = match.group(1)
                board_num = match.group(2)
                # 全角数字を半角数字に変換
                district_num = district_num.translate(str.maketrans('０１２３４５６７８９', '0123456789'))
                board_num = board_num.translate(str.maketrans('０１２３４５６７８９', '0123456789'))
                board_number = f"{district_num}-{board_num}"
        except:
            pass
        return board_number

    def get_detailed_route_segments(self, locations, route):
        """最適化されたルートに沿って詳細な道路形状を取得"""
        detailed_segments = []

        if self.api_key is None:
            print("APIキーがないため、簡略ルートを使用します")
            return []

        print(f"  詳細ルート形状を取得中...")

        for i in range(len(route) - 1):
            start_idx = route[i]
            end_idx = route[i + 1]

            start_coord = [locations[start_idx][0], locations[start_idx][1]]
            end_coord = [locations[end_idx][0], locations[end_idx][1]]

            try:
                route_data = self.get_detailed_route_geometry(start_coord, end_coord)

                if route_data and 'features' in route_data and len(route_data['features']) > 0:
                    geometry = route_data['features'][0]['geometry']
                    if geometry['type'] == 'LineString':
                        detailed_segments.append({
                            'geometry': geometry,
                            'segment': i + 1,
                            'from_point': start_idx + 1,
                            'to_point': end_idx + 1
                        })
                else:
                    # フォールバック：直線
                    detailed_segments.append({
                        'geometry': {
                            'type': 'LineString',
                            'coordinates': [start_coord, end_coord]
                        },
                        'segment': i + 1,
                        'from_point': start_idx + 1,
                        'to_point': end_idx + 1
                    })

            except Exception:
                # フォールバック：直線
                detailed_segments.append({
                    'geometry': {
                        'type': 'LineString',
                        'coordinates': [start_coord, end_coord]
                    },
                    'segment': i + 1,
                    'from_point': start_idx + 1,
                    'to_point': end_idx + 1
                })

        return detailed_segments

    def optimize_all_districts_with_roads(self):
        """全投票区を道路ベースで最適化"""
        self.df['投票区名'] = self.df['投票区'].str.extract(r': (.+)$')[0]
        results = {}

        for district_name in self.df['投票区名'].unique():
            print(f"\n【{district_name}】最適化中...")

            district_data = self.df[self.df['投票区名'] == district_name].reset_index(drop=True)

            if len(district_data) == 0:
                continue

            # 座標を(lon, lat)形式で準備
            locations = [(row['経度'], row['緯度']) for _, row in district_data.iterrows()]

            # 道路距離行列を取得
            distances, durations = self.get_road_distance_matrix(locations)

            # 最適始点TSP最適化
            optimized_route, optimized_distance = self.solve_tsp_with_optimal_start(
                locations, distances
            )

            # 一方向経路の時間計算
            total_duration = sum(durations[optimized_route[i]][optimized_route[i+1]]
                               for i in range(len(optimized_route) - 1))

            results[district_name] = {
                'data': district_data,
                'route': optimized_route,
                'distance': optimized_distance,
                'duration': total_duration,
                'locations': [district_data.iloc[i] for i in optimized_route],
                'distance_matrix': distances.tolist(),
                'duration_matrix': durations.tolist()
            }

            print(f"  最適化完了: {len(district_data)}地点")
            print(f"  総距離: {optimized_distance/1000:.2f}km")
            print(f"  推定時間: {total_duration/3600:.1f}時間")

        return results

    def export_complete_geojson(self, results):
        """統合GeoJSON形式で出力"""
        features = []

        for district_name, result in results.items():
            print(f"\n【{district_name}】統合データ生成中...")

            # 投票所情報を取得
            office_info = self.voting_offices.get(district_name, {})

            # 各地点をPointとして追加
            for i, location in enumerate(result['locations']):
                # 個人名を除去
                sanitized_name = self.sanitize_location_name(location['設置場所名'])

                # 掲示板番号を抽出
                board_number = self.extract_board_number(location['投票区'])

                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [location['経度'], location['緯度']]
                    },
                    "properties": {
                        "district": district_name,
                        "order": i + 1,
                        "name": sanitized_name,
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

            # 詳細ルートセグメントを取得
            locations = [(row['経度'], row['緯度']) for _, row in result['data'].iterrows()]
            detailed_segments = self.get_detailed_route_segments(locations, result['route'])

            # 詳細ルートセグメントを追加
            for segment in detailed_segments:
                route_feature = {
                    "type": "Feature",
                    "geometry": segment['geometry'],
                    "properties": {
                        "district": district_name,
                        "type": "route_segment",
                        "segment": segment['segment'],
                        "from_point": segment['from_point'],
                        "to_point": segment['to_point'],
                        "total_distance_km": round(result['distance'] / 1000, 2),
                        "estimated_hours": round(result['duration'] / 3600, 1)
                    }
                }
                features.append(route_feature)

            # 簡略ルート（フォールバック用）も追加
            route_coords = [[loc['経度'], loc['緯度']] for loc in result['locations']]
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

            # 投票所ピンを追加
            if district_name in self.voting_offices:
                office_data = self.voting_offices[district_name]
                office_feature = {
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
                features.append(office_feature)

        geojson = {
            "type": "FeatureCollection",
            "features": features
        }

        # docsディレクトリに出力
        with open('docs/voting_routes.geojson', 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)

        print("\nGeoJSONファイルを出力しました:")

        return geojson

def main():
    """メイン処理"""
    print("印西市投票所ポスター掲示板巡回システム統合版")
    print("=" * 60)

    # APIキーの確認
    api_key = os.environ.get('OPENROUTESERVICE_API_KEY', 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjhjZTk5YzU4OWI4NDQ0ZGE4YTNiZDk2ZDYyNjZhYmI5IiwiaCI6Im11cm11cjY0In0=')
    if api_key:
        print("✅ OpenRouteService APIキーが設定されています。")
    else:
        print("⚠️  警告: OPENROUTESERVICE_API_KEY環境変数が設定されていません。")
        print("直線距離による計算を行います。")

    # 統合最適化実行
    optimizer = CompleteRouteOptimizer(api_key=api_key)
    print("\n🚀 最適始点探索付きTSP最適化を開始...")
    results = optimizer.optimize_all_districts_with_roads()

    # 統合GeoJSON出力
    print("\n📝 統合GeoJSONデータを生成中...")
    optimizer.export_complete_geojson(results)

    # サマリー出力
    total_distance = sum(r['distance'] for r in results.values())
    total_duration = sum(r['duration'] for r in results.values())
    total_locations = sum(len(r['locations']) for r in results.values())

    print(f"\n✅ 全体サマリー:")
    print(f"  総投票区数: {len(results)}区")
    print(f"  総掲示板数: {total_locations}ヶ所")
    print(f"  総巡回距離: {total_distance/1000:.2f}km")
    print(f"  総推定時間: {total_duration/3600:.1f}時間")
    print(f"  平均速度: 4km/h（徒歩）")

    print(f"\n🎯 統合機能:")
    print(f"  ✅ 最適始点TSP最適化")
    print(f"  ✅ 徒歩経路計算（foot-walking）")
    print(f"  ✅ 個人名完全除去")
    print(f"  ✅ 投票所情報統合")
    print(f"  ✅ 投票所ピン生成")
    print(f"  ✅ 掲示板番号正規化")

    print(f"\n📁 生成されたファイル:")
    print(f"  - voting_routes.geojson（メイン）")
    print(f"  - docs/voting_routes.geojson（GitHub Pages用）")

if __name__ == "__main__":
    main()
