# MyGPT 設定の管理

ChatGPTのGPT「カーフィルムファニー 問い合わせ返信サポート」の設定をgitで管理する。

## ファイル

- `system-prompt.md` — GPTのInstructions(システムプロンプト)。**このファイルが原本**
- Actions のスキーマは本番の `https://funny-reservation-ghv4mlyezq-an.a.run.app/openapi` を参照
  (原本は `src/Presentation/Express/public/openapi.json`)

## 更新手順

1. `system-prompt.md` を編集してコミットする
2. ChatGPTのGPT編集画面を開き、Instructionsに `system-prompt.md` の全文を貼り付けて保存する
3. OpenAPIを変更した場合は、GPT編集画面のActionsでスキーマを再インポートする

ChatGPT側を直接編集した場合は、必ず同じ内容をこのファイルに反映してコミットすること
(ここが原本とズレると、障害調査時に「どのプロンプトで動いていたか」が追えなくなる)。
