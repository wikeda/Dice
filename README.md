# 3Dサイコロアプリ

スマートフォン向けの3Dサイコロを振ることができるWebアプリケーションです。

## 機能

- **3Dサイコロ表示**: Three.jsを使用したリアルな3Dサイコロ
- **サイコロ選択**: 1個〜3個のサイコロを選択可能
- **アニメーション**: 自然な回転アニメーション
- **結果表示**: 各サイコロの目と合計値を表示
- **レスポンシブデザイン**: スマートフォンに最適化

## 使用方法

1. サイコロの数を選択（1〜3個）
2. 「サイコロを振る」ボタンをタップ
3. アニメーション完了後に結果を確認

## 技術仕様

- **フロントエンド**: HTML5, CSS3, JavaScript
- **3Dライブラリ**: Three.js
- **デプロイ**: GitHub Pages対応

## ファイル構成

```
Dice/
├── index.html      # メインHTMLファイル
├── style.css       # スタイルシート
├── dice.js         # 3Dサイコロのロジック
├── requirements.md # 要件定義書
└── README.md       # このファイル
```

## GitHub Pagesでの公開

このアプリはGitHub Pagesで公開可能です。

1. このリポジトリをGitHubにプッシュ
2. リポジトリのSettings > PagesでGitHub Pagesを有効化
3. ブランチを`main`に設定
4. 公開URL: `https://[ユーザー名].github.io/[リポジトリ名]/Dice/`

## ブラウザ対応

- Chrome (推奨)
- Safari
- Firefox
- Edge

## ライセンス

MIT License
