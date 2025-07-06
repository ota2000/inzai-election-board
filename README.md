# 選挙ポスター掲示板巡回最適化システム

選挙ポスター掲示板を効率的に巡回するためのルート最適化システムです。

## 概要

- 各投票区の掲示板設置場所を最適な順序で巡回するルートを計算
- TSP（巡回セールスマン問題）アルゴリズムを使用して最短経路を算出
- 徒歩での巡回を想定した経路最適化
- GeoJSON形式で可視化データを出力

## ディレクトリ構成

```
inzai-election-board/
├── src/
│   └── inzai_election_board/
│       ├── __init__.py
│       └── route_optimizer.py      # メイン最適化システム
├── data/
│   ├── poster_board_locations.csv  # 掲示板設置場所データ
│   └── polling_places.csv          # 投票所データ
├── docs/
│   ├── index.html                  # GitHub Pages用ビューア
│   └── poster_board_routes.geojson # 最適化結果（GeoJSON）
├── tests/                          # テストファイル
├── pyproject.toml                  # プロジェクト設定
└── README.md                       # このファイル
```

## セットアップ

### 前提条件

- Python 3.12以上
- uv（推奨）またはpip

### インストール

```bash
# プロジェクトをクローン
git clone https://github.com/ota2000/inzai-election-board.git
cd inzai-election-board

# uvを使用する場合（推奨）
uv sync

# pipを使用する場合
pip install -e .
```

## 使用方法

### 1. テスト実行（推奨）

まずはテスト用の軽量版で動作確認：

```bash
# uvを使用する場合
uv run test-optimizer

# pipを使用する場合
test-optimizer
```

### 2. 本格実行

実際のデータで完全な最適化を実行：

```bash
# APIキーを設定（オプション）
export OPENROUTESERVICE_API_KEY="your-api-key"

# uvを使用する場合
uv run inzai-election-board

# pipを使用する場合
inzai-election-board
```

### 3. 結果の確認

- 最適化結果は `docs/poster_board_routes.geojson` に出力されます
- `docs/index.html` でWebブラウザで可視化できます
- GitHub Pagesで公開されている場合は、そちらでも確認可能です

## 機能

### 主な機能

- **最適始点探索**: 全ての掲示板を始点候補として最適なルートを計算
- **TSP最適化**: 2-opt法による経路改善
- **徒歩経路計算**: OpenRouteService APIを使用した実際の歩行経路
- **個人情報保護**: 個人宅関連の住所を自動的に匿名化
- **GeoJSON出力**: 地図上で可視化可能な形式で結果を出力

### インタラクティブ地図機能

- **投票区別表示**: 23の投票区から選択して詳細表示
- **最適化された経路**: TSPアルゴリズムによる効率的な巡回順序
- **詳細情報**: 各地点の住所、距離、推定時間を表示
- **レスポンシブデザイン**: PC・スマートフォン・タブレット対応

### データ形式

#### 入力データ

- `poster_board_locations.csv`: 掲示板設置場所
- `polling_places.csv`: 投票所情報

#### 出力データ

- `poster_board_routes.geojson`: 最適化されたルート情報（GeoJSON形式）

## 技術仕様

### バックエンド

- **言語**: Python 3.12+
- **主要ライブラリ**: pandas, numpy, geopy, requests
- **最適化アルゴリズム**: TSP（最近傍法 + 2-opt改善）
- **API**: OpenRouteService（徒歩経路計算）
- **出力形式**: GeoJSON

### フロントエンド

- **技術**: HTML5, CSS3, JavaScript (ES6+)
- **地図ライブラリ**: Leaflet.js
- **データ形式**: GeoJSON
- **ホスティング**: GitHub Pages

## 開発

### 開発環境のセットアップ

```bash
# 開発用の依存関係をインストール
uv sync --dev

# テストの実行
uv run pytest

# 詳細なテスト実行
uv run pytest -v

# カバレッジ付きテスト実行
uv run pytest --cov=src/inzai_election_board

# 特定のテストファイルのみ実行
uv run pytest tests/test_route_optimizer.py

# コードフォーマット
uv run black src/
uv run isort src/
```

### テスト構成

プロジェクトには包括的なテストスイートが含まれています：

#### テストファイル

- **`tests/test_route_optimizer.py`**: 包括的なテストスイート
  - **基本機能テスト**:
    - モジュールのインポート確認
    - データファイルの存在確認
    - pandas/numpy の動作確認
  - **CompleteRouteOptimizerクラスのテスト**:
    - 地名サニタイズ機能のテスト
    - 掲示板番号抽出のテスト
    - 距離計算アルゴリズムのテスト
  - **TSPアルゴリズムの詳細テスト**:
    - 最適化アルゴリズムの動作確認
    - ルート距離計算の検証
  - **ユーティリティ機能テスト**:
    - レート制限機能の確認

#### テスト実行例

```bash
# 全テストの実行
uv run pytest

# 詳細表示
uv run pytest -v

# 特定のテストクラスのみ
uv run pytest tests/test_route_optimizer.py::TestBasicFunctionality

# 特定のテストメソッドのみ
uv run pytest tests/test_route_optimizer.py::TestCompleteRouteOptimizer::test_sanitize_location_name

# テスト結果の表示オプション
uv run pytest -v --tb=short  # 短いトレースバック
uv run pytest -x             # 最初の失敗で停止
uv run pytest --maxfail=3    # 3回失敗で停止
```

#### テストカバレッジ

各テストは以下の側面をカバーしています：

- **機能テスト**: 個別の機能が正しく動作することを確認
- **統合テスト**: 複数のコンポーネントが連携して動作することを確認
- **エラーハンドリング**: 異常な入力や状況に対する適切な処理を確認
- **パフォーマンス**: 実行時間が許容範囲内であることを確認
- **データ整合性**: 入力・出力データの形式と内容が正しいことを確認
- **ファイルI/O**: ファイルの読み書きが正しく行われることを確認

### 新機能の追加

1. `src/inzai_election_board/` にモジュールを追加
2. テストを `tests/` に追加
3. 必要に応じて `pyproject.toml` を更新

## GitHub Pages

このプロジェクトは GitHub Pages で可視化結果を公開できます。

1. `docs/` ディレクトリに最適化結果が出力されます
2. GitHub Pages の設定で `docs/` を公開ディレクトリに設定
3. `docs/index.html` で結果を確認可能

## データについて

- **総投票区数**: 23区
- **総地点数**: 181地点
- **総巡回距離**: 約120km
- **データ更新日**: 2025年7月6日

## ブラウザ対応

- Chrome (推奨)
- Firefox
- Safari
- Edge

## 使用方法（Web版）

1. **投票区選択**: 上部のボタンから特定の投票区を選択
2. **全区表示**: "全区表示"ボタンで全投票区の概要を表示
3. **地点詳細**: マーカーをクリックすると詳細情報を表示
4. **巡回順序**: 右側パネルで最適化された順序を確認
5. **データダウンロード**: GeoJSONデータをダウンロード可能

## ライセンス

MIT License

## 貢献

プルリクエストや Issue の報告を歓迎します。

---

**注意**: このシステムは選挙活動の効率化を目的としており、個人情報の取り扱いには十分注意してください。
