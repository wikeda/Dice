# 3Dサイコロ ラウンジ (Vite + TypeScript)

Three.js と Cannon-es を用いた 3D サイコロ Web アプリです。Vite + TypeScript で構築し、ジェスチャー／ボタン操作で 1〜6 個のサイコロを振ることができます。テーブル内には見えないウォールがあり、サイコロは画面外に出ず、停止時はテーブルに平行な姿勢へスナップされます。

## 主な特徴
- **ハイエンド UI**: ガラス調のラウンジを想起させるデザインを CSS で実装。
- **Three.js × Cannon-es 連携**: 3D 表示と物理シミュレーションを分離し、正確な回転とバウンドを再現。
- **ジェスチャー操作**: 3D エリア上でのスワイプで投射方向と強さ/リフトを算出。
- **最大 6 個のサイコロ**: 個別結果と合計値を即座に表示。
- **Vite ビルド**: GitHub Pages など静的ホスティングでそのまま配信可能。

## 動かし方
```bash
# 依存パッケージのインストール
npm install

# 開発サーバー (ホットリロード)
npm run dev

# 本番ビルド (dist/ 配下に生成)
npm run build

# ビルド結果のローカルプレビュー
npm run preview
```

## プロジェクト構成
```
Dice/
├── index.html              # UI レイアウト & 各種ボタン
├── package.json            # 依存 & スクリプト (TypeScript/Vite)
├── src/
│   ├── main.ts             # Three.js + Cannon-es のメインロジック
│   └── styles.css          # ラグジュアリーなテーマ
├── tsconfig*.json          # TypeScript 設定
├── vite.config.ts          # Vite 設定
└── requirements.md         # 要件定義書
```

## 実装メモ
- Cannon-es の `sleep` イベントを利用してサイコロが静止した瞬間に出目を確定。
- 停止後は 90 度単位で姿勢をスナップし、浮き/めり込みを防止。
- 8 秒以上経過しても停止しない場合はフェイルセーフで結果を確定。
- Three.js・Cannon-es を単一バンドルに含めているため、`npm run build` で 500 kB 超の警告が出ますが、GitHub Pages 等でのホストは問題ありません。

## ライセンス
MIT License