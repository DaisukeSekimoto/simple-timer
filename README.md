# Simple Timer

日報に記載する作業時間を、1日単位で記録するシンプルなタイマーです。

カウントダウンとストップウォッチに対応しており、計測した作業を当日の履歴として保存できます。サーバーやアカウントは不要で、GitHub Pagesなどの静的サイトとして公開。

## 使い方

1. 必要に応じて「タスク名を入力」を押し、作業名を入力します。
2. カウントダウンまたはストップウォッチを選択します。
3. 「開始」を押して計測を始めます。タスク名が未入力でも計測できます。
4. 作業が終わったら「次の作業に移る」を押します。
5. 計測結果が今日の履歴に保存されます。

## 履歴の保存について

- 履歴はサーバーには送信されず、使用中のブラウザのストレージに保存されます。そのため、同じ公開URLを同じ端末・同じブラウザで開いた場合に限り、以前の履歴を参照できます。
- **ブラウザのキャッシュ、Cookie、サイトデータ、閲覧データなどを削除すると、保存されている履歴も消える可能性があります。**
- 「設定」より、バックアップとインポートが可能。

## ファイル構成

- `index.html`：画面構成とブラウザの通信制限
- `assets/main.js`・`assets/features/`：ブラウザがES Modulesとして読み込む起動処理と機能別処理
- `assets/storage/`・`assets/shared/`・`assets/ui/`：保存・共通計算・共通UI
- `assets/styles/`：機能別のCSS
- `assets/styles.css`・`service-worker.js`：ビルドで生成する配信用ファイル
- `tests/`：保存・計測・画面操作の回帰テスト

**各ファイルの役割、状態の管理、保存形式、開発・配信手順は [構成とプログラムの役割](docs/architecture.md) を参照してください。**

## 開発

Node.js 22.13以降を使用します。JavaScriptと分割CSSは `assets/` 内を編集し、`npm run build`で結合CSSとService Workerを更新します。

```bash
npm ci
npm run build
npm run check
npm test
```

- 画面操作も確認する場合は `npx playwright install chromium` の後に `npm run test:browser` を実行します（簡易サーバーにPython 3を使用）。
- `npm run build:site` で、静的ホストへの公開に必要なファイルだけを `dist/` に生成します。

## 動作環境

最新版のGoogle Chrome、Microsoft Edge、Safari、Firefoxなど、`localStorage`と`dialog`要素に対応したブラウザを使用してください。

## ブラウザ側の通信制限

- HTMLの先頭でContent Security Policy（CSP）を設定しています。
- `connect-src 'none'` でページからのfetch・XMLHttpRequest・WebSocket・EventSource・sendBeaconなどを、`form-action 'none'` でフォーム送信を禁止します。
- 外部サイトのスクリプト・画像・スタイル・埋め込みも許可せず、リファラーは送信しません。JSONバックアップのダウンロードと読み込みは端末内で行います。
