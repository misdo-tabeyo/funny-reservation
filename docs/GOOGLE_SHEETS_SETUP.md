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

| 列 | 項目 | 例 |
|----|------|-----|
| A | メーカー名 | トヨタ |
| B | 車種名 | プリウス |
| C | 車種読み | プリウス |
| D | フロントセット | 27000 |
| E | フロント | 18000 |
| F | フロント左右 | 10000 |
| G | (空列) | |
| H | リアセット | 22000 |
| I | リア左右 | 9000 |
| J | クォーター左右 | |
| K | リア | 14000 |

## 6. 動作確認

```bash
# 開発サーバー起動
pnpm dev

# API テスト
curl http://localhost:3000/pricing/manufacturers
```
