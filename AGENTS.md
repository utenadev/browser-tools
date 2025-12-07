ユーザーとのやりとりは日本語で
ソースコメントと、git commitメッセージは英語で行うこと

その日の最後に作業内容の履歴をここに書いて、その日最初の起動時に確認すること

実装は bunで行う
このプロジェクトでは、chrome beta を使うこと
- browser-tools start --channel beta
- chrome 単体は "C:\Program Files\Google\Chrome Beta\Application\chrome.exe" を使って
UTはtest.ts にある
ブラウザでのテスト E2E Testは tests/e2e.test.ts を使うこと
基本、手動は必要いはず

## 作業履歴
See works.md for daily work logs.

### 2025-12-07
- Fixed run subcommand implementation: centralized commands in index.ts, improved error handling.
- Updated end-work-session command: /quit to /exit, fixed frontmatter.
- Built browser-tools.exe.
- Verified UT and E2E tests pass.
