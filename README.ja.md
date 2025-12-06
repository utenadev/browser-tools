# Browser Tools

Chrome DevTools Protocol を使用したエージェント支援型ウェブ自動化ツール。これらのツールは、リモートデバッグが有効な `:9222` で実行中の Chrome に接続します。

## インストール

```bash
bun install
bun build src/index.ts --outdir dist --target bun
```

その後、`browser-tools` コマンドを使用してください。

## ヘルプ

```bash
browser-tools --help          # すべてのコマンドを表示
browser-tools start --help    # start コマンドのオプションを表示
browser-tools <command> --help # 特定のコマンドのヘルプを表示
```

## .exe のビルド (Windows)

```bash
bun build --compile src/index.ts --outfile browser-tools.exe --target bun
```

これにより、Windows (Win10+ x64) 用のスタンドアロン `browser-tools.exe` 実行可能ファイルが作成されます。

## 設定ファイル

プロジェクトルートに `.browser-tools.json` ファイルを配置することで、デフォルト設定を保存できます。

```json
{
  "chromePath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "channel": "stable",
  "headless": false,
  "profile": false
}
```

これらの設定はコマンドラインオプションで上書き可能です。

## これらのツールの呼び出し方法

**エージェントにとって重要**: Bash ツール経由で呼び出す場合、`browser-tools` コマンドにサブコマンドを使用してください。

✓ 正しい:
```bash
browser-tools start
browser-tools nav https://example.com
browser-tools pick "Click the button"
```

✗ 間違った:
```bash
node dist/index.js start        # 'node' プレフィックスを使用しない
./dist/index.js start           # './' プレフィックスを使用しない
```

## Chrome の起動

```bash
browser-tools start              # 新しいプロファイル
browser-tools start --profile    # ユーザーのプロファイル (クッキー、ログイン) をコピー
browser-tools start --headless   # ヘッドレスモードで実行
```

`:9222` でリモートデバッグを有効にして Chrome を起動。`--profile` を使用してユーザーの認証状態を保持。

## ナビゲート

```bash
browser-tools nav https://google.com
browser-tools nav https://google.com --new
```

URL にナビゲート。`--new` フラグを使用して現在のタブを再利用せずに新しいタブで開く。

## JavaScript の評価

```bash
browser-tools eval 'document.title'
browser-tools eval 'document.querySelectorAll("a").length'
```

アクティブなタブで JavaScript を実行。コードは非同期コンテキストで実行。データ抽出、ページ状態の検査、またはプログラムによる DOM 操作に使用。

## スクリーンショット

```bash
browser-tools screenshot
```

現在のビューポートをキャプチャし、一時ファイルパスを返す。ページ状態を視覚的に検査したり、UI の変更を検証したりするために使用。

## 要素の選択

```bash
browser-tools pick "Click the submit button"
```

**重要**: ユーザーがページ上の特定の DOM 要素を選択したい場合にこのツールを使用。インタラクティブなピッカーを起動し、ユーザーが要素をクリックして選択できる。複数の要素を選択可能 (Cmd/Ctrl+クリック) で、完了したら Enter を押す。選択された要素の CSS セレクタを返す。

一般的な使用例:
- ユーザーが「このボタンをクリックしたい」という場合 → このツールで選択させる
- ユーザーが「これらのアイテムからデータを抽出したい」という場合 → このツールで要素を選択させる
- ページ構造が複雑または曖昧な場合に特定のセレクタが必要なとき

## クッキー

```bash
browser-tools cookies
```

現在のタブのすべてのクッキーを表示 (ドメイン、パス、httpOnly、secure フラグを含む)。認証の問題をデバッグしたり、セッション状態を検査したりするために使用。

## Google 検索

```bash
browser-tools search "rust programming"
browser-tools search "climate change" -n 10
browser-tools search "machine learning" -n 3 --content
```

Google を検索して結果を返す。オプション:
- `-n <num>` - 結果の数 (デフォルト: 5、高い数値の場合はページネーションをサポート)
- `--content` - 各結果から読み取り可能なコンテンツを markdown として取得・抽出

## ページコンテンツの抽出

```bash
browser-tools content https://google.com
```

URL にナビゲートし、読み取り可能なコンテンツを markdown として抽出。記事抽出に Mozilla Readability を使用し、HTML-to-markdown 変換に Turndown を使用。JavaScript コンテンツを含むページでも動作 (ページのロードを待つ)。

## 検索 + コンテンツ戦略

**すべての検索結果からコンテンツを取得したい場合、`browser-tools search --content` を使用**。これは高速だが、関連性の低い結果からもコンテンツを取得する可能性がある。

```bash
browser-tools search "climate change effects" -n 3 --content
```

**関連性の高い結果のみからコンテンツを選択的に取得したい場合、`browser-tools search` + `browser-tools content` を使用**。まず検索し、タイトル/スニペットをレビューしてから、有望な URL のコンテンツのみを取得。

```bash
browser-tools search "climate change effects" -n 10
# 結果をレビューしてから特定のものを取得:
browser-tools content https://relevant-article.com
browser-tools content https://another-good-source.com
```