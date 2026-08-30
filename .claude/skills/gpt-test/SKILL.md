---
name: gpt-test
description: GPTプロンプト(docs/gpt/system-prompt.md)の返信生成をサブエージェントで再現テストする。引数はサンプルファイルのパス(省略時は docs/gpt/test/samples/ の全件)と、任意でモデル名(sonnet|haiku。既定 sonnet)。
---

# GPTプロンプトのテスト実行

マイGPT相当の返信生成を、サブエージェントに本番APIを叩かせて再現する。

## 手順

1. `docs/gpt/system-prompt.md` を読む(これがテスト対象のシステムプロンプト)
2. 対象サンプルを決める
   - 引数にファイルパスがあればそのファイル
   - なければ `docs/gpt/test/samples/` 直下の全 `.md` ファイル
3. サンプルごとに Agent ツールでサブエージェントを起動する
   - `subagent_type: "claude"`、`model`: 引数指定がなければ `"sonnet"`
   - 複数サンプルは並列に起動してよい
   - プロンプトは下記テンプレートの構成で組み立てる(システムプロンプトは全文をそのまま埋め込む)
4. 各サブエージェントの結果から「返信文」「実行したAPI呼び出し」を、
   **一切書き換えずに**そのままユーザーに提示する
   (返信文の出来に問題があっても、勝手に直さず観察結果として報告する)

## サブエージェントに渡すプロンプトのテンプレート

```
あなたはこれからGPTアシスタントとして振る舞い、お客様の問い合わせに対する返信文を1通作成します。以下のシステムプロンプトに厳密に従ってください。

=== システムプロンプト ここから ===
{docs/gpt/system-prompt.md の全文}
=== システムプロンプト ここまで ===

# テスト用API接続情報

今日は {今日のJST日付(曜日つき)} です（JST）。

システムプロンプト中のAPIは、Bashツールのcurlで以下のように呼び出せます（BASE=https://funny-reservation-ghv4mlyezq-an.a.run.app）:

- getPriceList:
  curl -sS --get --data-urlencode "carId=車名" "$BASE/pricing/prices"
  （exact指定時は --data-urlencode "exact=true" を追加）
- checkBookingAvailability:
  curl -sS --get --data-urlencode "startAt=YYYY-MM-DDTHH:00:00+09:00" --data-urlencode "durationHours=数値" "$BASE/booking/availability"
- getNearestAvailableBookingSlots:
  curl -sS --get --data-urlencode "from=YYYY-MM-DDTHH:00:00+09:00" --data-urlencode "durationHours=数値" --data-urlencode "limit=数値" --data-urlencode "searchDays=数値" "$BASE/booking/available-slots/nearest"
- listCarsByManufacturer（404時の表記揺れ照合にのみ使用）:
  curl -sS "$BASE/pricing/manufacturers/メーカー名/cars"
  （パスに日本語をそのまま書いてよい）

POST系（予約作成）は絶対に呼ばないこと。上記以外のエンドポイントも呼ばないこと。

# お客様からの問い合わせ

{サンプルファイルの全文}

# 出力形式

最終出力は以下の2部構成にすること:

## 返信文
（お客様に送る返信文をそのまま）

## 実行したAPI呼び出し
（呼び出したAPIと主要パラメータ、結果の要約を箇条書きで）
```

## 注意

- 空き状況は本番カレンダー依存のため、実行日によって結果が変わる
- 新しいサンプルを保存するときは実名・電話番号を匿名化する(リポジトリはpublic)
