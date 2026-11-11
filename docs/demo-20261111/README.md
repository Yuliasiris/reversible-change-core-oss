# 戻したい変更だけ、戻す — 操作できる例（2026-11-11）

[Reversible Change Core](../../README.md) v0.1.3の公開ソースを使った、**単一HTMLファイルの実行例**です。AIが作った案だけを戻し、後から人が変更した別の部分は残す、という使いどころを示します。

## まず試す

1. [`index.html`](./index.html) を開き、GitHubの **Download raw file** で保存します。
2. 保存したHTMLを通常のブラウザーで開きます。アカウント、APIキー、通信、Node.jsは不要です。
3. 「ベースをB案にする」→「ドラムを手修正する」→「ベースだけA案へ戻す」と操作してください。ドラムの手修正版は残ります。
4. 「別の変更と衝突したら？」も試せます。元の値が変わっていれば古い逆変更は拒否します。

**This is a self-contained, offline, single-file demo** of a checked reversible JSON-field change, built from Reversible Change Core v0.1.3. It does not play audio, connect to an AI, or implement a DAW. Download `index.html` and open it locally.

## どこまで動くか

- coreの変更・逆変更・変更前の値の検査を使っています。
- デモ画面の保存・JSON書出しは、このデモ側の機能です。
- 音楽的な妥当性、保存先の認可、文書・revisionの同一性、並行変更への排他制御は提供しません。
- テスト用の架空データだけを使い、外部へ自動送信しません。
- リリース候補ではNode.js 22.16.0で18条件が成功しました。うち6条件は模擬DOMであり、実ブラウザーの動作検証ではありません。実ブラウザーの新規確認は未実施です。

## 出所・権利・フィードバック

- 使用core: [Reversible Change Core](https://github.com/Yuliasiris/reversible-change-core-oss), commit `b5a21e8b9efef79deb9bee36edafb0b8c529db43`
- 対応するcore 0.1.3はMIT License。HTMLにはcoreのコードを含めています。
- 実際に使いたい場面、不具合、改善案は[Issues](https://github.com/Yuliasiris/reversible-change-core-oss/issues)へ。個人情報、非公開作品、秘密鍵などは貼らないでください。脆弱性は[SECURITY.md](../../SECURITY.md)をご参照ください。

新たなStarや助成金採択を主張するものではありません。試した人の実際の反応を募るための公開例です。
