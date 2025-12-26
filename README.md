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
-   **自動データ整形**: 保存時に表記ゆれを自動で統一します。
    -   電話番号: `01558`で始まる番号（豊頃・広尾等）は `01558-X-XXXX` に、その他はAI抽出結果を優先出力。
    -   日付: 和暦（昭和・平成など）も自動で**西暦（YYYY/MM/DD）**に変換・統一。
-   **入力バリデーション**: 必須項目（郵便番号など）の未入力を赤枠で警告します。

### 4. 安心のデータ管理
-   **誤操作防止**: 「CLEAR」ボタンは誤削除防止のため、2回クリック（確認フロー）が必要です。
-   **完全対応エクスポート**:
    -   **CSV/Excel**: 全31項目の指定フォーマット（西暦、住所分割済み）で出力。
    -   **全件出力**: データ有無に関わらず、必ず会員番号 `00000001` ～ `00002000` の2000行を出力します。
    -   **文字化け防止**: BOM付きCSVでExcelでも文字化けせずに開けます。

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
    -   完了したら「CLEAR」ボタンを**2回クリック**（確認→実行）してデータをリセットします。

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