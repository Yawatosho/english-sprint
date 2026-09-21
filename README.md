# Academic Library English Sprint

大学図書館・オープンアクセス・機関リポジトリなどについて、英語で瞬時に話す練習をするためのWebアプリです。模範英文の完全一致ではなく、自分の知っている英語で意味の通る発話をすることを目的としています。

## Features

- 50 speaking prompts
- 100 chunks for short-expression practice (no audio)
- Example answers
- Audio playback
- Category practice
- Random 10-question sessions
- Difficult-question review
- Local progress storage

## Audio files

音声は `audio/` に次のファイル名で配置してください。教材番号とファイル番号は1対1で対応しています。

```text
audio/q001.mp3
audio/q002.mp3
...
audio/q050.mp3
```

音声ファイルが未配置または読み込めない場合、例文はそのまま利用でき、再生ボタンだけが無効になります。音声の自動再生は行いません。

## Practice materials

トップ画面で「文章を練習」と「チャンクを練習」を切り替えられます。チャンクは `chunk.txt` の100件を `js/chunks.js` に収録し、各チャンクに使用例を1文添えています。チャンクに音声はありません。10問・全問・苦手・カテゴリ別の練習と自己評価は両教材で使えます。学習記録は教材ごとに分けて保存します。

## Hosting

ビルド作業やサーバーは不要です。リポジトリをGitHub Pagesの公開元に設定すると、そのまま配信できます。サイト内のファイル参照は相対パスです。

## Privacy

学習記録はブラウザの `localStorage` にのみ保存され、外部サーバーには送信されません。ログインは使用していません。サイトの利用状況を把握するため、Google Analytics 4を使用しています。

## Repository settings

GitHubリポジトリ管理者向けの推奨設定です。

- Description: `English speaking practice for academic libraries, open access, institutional repositories, and scholarly communication.`
- Website: `https://yawatosho.github.io/english-sprint/`
