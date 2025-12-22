# サプリCSVセンター Ultimate (Supplement CSV Center)

Google Gemini AIを活用した、業務効率化のための**入会申込書データ自動抽出ツール**です。
PDF（マルチページ対応）や画像を一括で読み込み、AIがデータを抽出。比較編集機能や自動補正機能により、手入力の手間を極限まで削減します。

![Status](https://img.shields.io/badge/Status-Ultimate_Edition-blue?style=for-the-badge)

##  主な機能 (Elite Features)

### 1. 高度なAI抽出 (Powered by Gemini)
-   **マルチページPDF対応**: 数十ページのPDFファイルも、1ページ＝1件として一括処理します。
-   **一括アップロード**: フォルダ内の大量の画像/PDFをドラッグ＆ドロップでまとめて解析キューに入れます。
-   **処理タイマー**: 解析にかかる時間を0.1秒単位でリアルタイム計測・表示します。

### 2. プロ仕様の編集・修正 (Split View)
-   **比較編集モード**: 編集ボタンを押すと、左側に「原本（画像/PDF）」、右側に「入力フォーム」を並べて表示。
-   **ショートカットキー**: マウスレスでの高速操作を実現。
    -   `Ctrl + Enter`: 保存して閉じる (Save & Close)
    -   `Esc`: キャンセル (Cancel)

### 3. データ品質向上 (Normalization & Validation)
-   **自動データ整形**: 保存時に表記ゆれを自動で統します。
    -   電話番号: `09012345678` → `090-1234-5678`
    -   日付: `2023年1月1日` → `2023/01/01`
-   **入力バリデーション**: 必須項目（郵便番号など）の未入力を赤枠で警告します。

### 4. 安心のデータ管理
-   **自動保存 (LocalStorage)**: ブラウザを閉じてもデータは保持されます。「CLEAR」ボタンを押すまで消えません。
-   **Excel出力**: 実務で即座に使える `.xlsx` 形式でダウンロード可能。
-   **CSV出力**: 従来のシステム連携用。

---

## セットアップ & 起動方法

### 前提条件
-   Docker がインストールされていること
-   Google Gemini API キーを持っていること ([取得はこちら](https://aistudio.google.com/))

### 1. APIキーの設定
プロジェクト直下に `.env.local` ファイルを作成し、APIキーを記述します。

```bash
GOOGLE_GEMINI_API_KEY=あなたのAPIキー
```

### 2. アプリケーションの起動
Dockerを使用して一発で環境構築・起動が可能です。

```bash
# 初回起動 または 設定変更時
docker-compose up --build

# 2回目以降
docker-compose up
```

起動後、ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

---

## 使い方ガイド

1.  **アップロード**: 画面中央にファイルをドラッグ＆ドロップします（複数可）。
2.  **待機**: 右下のタイマーが動き出し、解析が進みます。
3.  **確認・編集**:
    -   抽出されたデータが表形式で表示されます。
    -   修正が必要な場合は アイコンをクリックして「Split View」を開きます。
    -   原本を見ながら修正し、`Ctrl+Enter` で保存します。
4.  **出力**:
    -   「EXCEL」または「CSV」ボタンでファイルをダウンロードします。
    -   完了したら「CLEAR」ボタンでデータをリセットできます。

---

## トラブルシューティング

**Q. APIキーを変えたい**
A. `.env.local` を書き換えた後、以下のコマンドでコンテナを再構築してください。
```bash
docker-compose down -v && docker-compose up --build
```

**Q. エラー「Module not found」が出る**
A. 新しいライブラリ（xlsxなど）がDockerに認識されていない可能性があります。上記と同じく `down -v` コマンドでボリュームを削除して再ビルドしてください。

**Q. 住所が出ない**
A. 手書き文字が崩れている場合、AIが読み取れないことがあります。編集画面で手動修正をお願いします。

---

## 技術スタック
-   **Frontend**: Next.js 14, React, Tailwind CSS, Lucide Icons
-   **Backend**: Next.js API Routes
-   **AI**: Google Gemini API (Gemini-3.5-flash)
-   **Infrastructure**: Docker, Docker Compose
-   **Libraries**: xlsx (Excel export), lucide-react (Icons)