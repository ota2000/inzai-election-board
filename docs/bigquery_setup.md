# BigQuery データソースの使用方法

## 概要

このプロジェクトは、CSVファイルの代わりにGoogle BigQueryからポスターボードのデータを取得できるようになりました。

## 設定方法

### 1. 認証設定

BigQueryを使用するには、Google Cloud認証が必要です：

```bash
# Google Cloud CLIをインストール（まだの場合）
# macOS:
brew install google-cloud-sdk

# 認証
gcloud auth application-default login
```

### 2. 依存関係のインストール

```bash
pip install google-cloud-bigquery
```

### 3. 使用方法

#### デフォルト設定（BigQuery）
```bash
python -m board_route_optimizer.cli
```

デフォルトでは以下の設定でBigQueryを使用します：
- プロジェクトID: `pdf-reader-463007`
- データセット: `prd_public`
- テーブル: `poster_boards`
- 都道府県: `千葉県`
- 市区町村: `印西市`

#### カスタム設定
```bash
# 別の市区町村のデータを取得
python -m board_route_optimizer.cli --prefecture 東京都 --city 中央区

# 別のプロジェクトを使用
python -m board_route_optimizer.cli --project-id my-project
```

#### CSVファイルを使用（従来の方法）
```bash
python -m board_route_optimizer.cli --use-csv
```

## データ形式

BigQueryのテーブルスキーマ：
- `name`: 設置場所名
- `lat`: 緯度
- `long`: 経度 
- `status`: ステータス（done, reserved, not_yet等）
- `voting_district_number`: 投票区番号（INT64）
- `number`: 掲示板番号（例: "7-1"）
- `address`: 住所

## トラブルシューティング

### 認証エラー
```
google.auth.exceptions.DefaultCredentialsError
```
→ `gcloud auth application-default login` を実行してください

### テーブルが見つからない
```
google.cloud.exceptions.NotFound
```
→ プロジェクトID、データセットID、テーブルIDを確認してください