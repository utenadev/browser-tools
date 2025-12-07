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

### 2025-12-06
- Implemented comprehensive improvements based on code review:
  - Phase 1: Added content-extractor utility for code deduplication, integrated yargs for CLI parsing with help system.
  - Phase 2: Added Playwright for E2E testing with basic test cases.
  - Phase 3: Standardized error handling across modules, improved Google search selectors.
  - Phase 4: Added configuration file support, enhanced Japanese documentation.
  - Phase 5: Further error handling standardization.
- Added navigate command as alias for nav.
- Enhanced help system with --help for all commands and connection checks.
- Built standalone .exe for Windows.
- Configured to use Chrome Beta channel by default.