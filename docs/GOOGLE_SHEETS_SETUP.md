# Google Sheets API 設定手順

カーフィルム施工の料金表をGoogle Sheetsから取得するための設定手順です。

## 1. Google Sheets API の有効化

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 既存のプロジェクト（Google Calendar用と同じ）を選択
3. 「APIとサービス」→「ライブラリ」
4. "Google Sheets API" を検索
5. 「有効にする」をクリック

## 2. サービスアカウントの設定

既存のサービスアカウント（Google Calendar用）をそのまま使用できます。

もし新規作成する場合：
1. 「IAMと管理」→「サービスアカウント」
2. 「サービスアカウントを作成」
3. サービスアカウント名を入力（例：`funny-reservation-sheets`）
4. 「作成して続行」→「完了」
5. 作成したサービスアカウントをクリック → 「キー」タブ
6. 「鍵を追加」→「新しい鍵を作成」→ JSON形式
7. ダウンロードされたJSONファイルを保存

## 3. スプレッドシートの共有設定

1. 料金表のスプレッドシートを開く
2. 右上の「共有」ボタンをクリック
3. サービスアカウントのメールアドレスを追加
   - 例：`funny-reservation@project-id.iam.gserviceaccount.com`
4. 権限を「閲覧者」に設定
5. 「送信」をクリック

## 4. 環境変数の設定

`.env` ファイルに以下を追加：

```bash
# Google サービスアカウント（Calendar と共通）
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Calendar
GOOGLE_CALENDAR_ID=xxxxx@gmail.com

# Google Sheets（料金表）
GOOGLE_SHEETS_SPREADSHEET_ID=1abc...xyz
```

### スプレッドシートIDの確認方法

スプレッドシートのURLから取得：
```
https://docs.google.com/spreadsheets/d/【ここがスプレッドシートID】/edit
```

### プライベートキーの設定

JSONファイルの `private_key` フィールドをコピーして、改行を `\n` に置換：

```json
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
}
```

## 5. スプレッドシートの構造

各メーカーごとにシートを作成：
- シート名：「トヨタ」「レクサス」など
- 1-2行目：ヘッダー行（読み飛ばす）
- 3行目以降：データ

### 列構成

実装は A〜R 列を参照します（1-2行目はヘッダー、3行目以降がデータ）。

| 列 | 項目 | 例 |
|----|------|-----|
| A | メーカー名 | トヨタ |
| B | 車種名 | プリウス |
| C | 車種読み | ぷりうす |
| D | フロントセット料金 | 27000 |
| E | フロントセット施工時間 | 2 |
| F | フロント料金 | 18000 |
| G | フロント施工時間 | 2 |
| H | フロント左右料金 | 10000 |
| I | フロント左右施工時間 | 2 |
| J | (空列) | |
| K | リアセット料金 | 22000 |
| L | リアセット施工時間 | 3 |
| M | リア左右料金 | 9000 |
| N | リア左右施工時間 | 2 |
| O | クォーター左右料金 | 12000 |
| P | クォーター左右施工時間 | 2 |
| Q | リア料金 | 14000 |
| R | リア施工時間 | 2 |

#### 施工時間の単位について

- 予約ドメインは **1時間単位** なので、施工時間は基本的に「時間（整数）」で入力してください。
- 万一「分」で入力している場合（例: 300）、サーバー側で `300/60=5` のように解釈し、端数は切り上げます。

## 6. 動作確認

```bash
# 開発サーバー起動
pnpm dev

# API テスト
curl http://localhost:3000/pricing/manufacturers
```
