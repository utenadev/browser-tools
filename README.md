# Browser Tools

Chrome DevTools Protocol tools for agent-assisted web automation. These tools connect to Chrome running on `:9222` with remote debugging enabled.

## Installation

```bash
bun install
bun build src/index.ts --outdir dist --target bun
```

Then use `browser-tools` command.

## Help

```bash
browser-tools --help          # Show all commands
browser-tools start --help    # Show start command options
browser-tools <command> --help # Show specific command help
```

## Building .exe (Windows)

```bash
bun build --compile src/index.ts --outfile browser-tools.exe --target bun
```

This creates a standalone `browser-tools.exe` executable for Windows (Win10+ x64).

## How to Invoke These Tools

**CRITICAL FOR AGENTS**: Use the `browser-tools` command with subcommands. When invoking via the Bash tool:

✓ CORRECT:
```bash
browser-tools start
browser-tools nav https://example.com
browser-tools pick "Click the button"
```

✗ INCORRECT:
```bash
node dist/index.js start        # Don't use 'node' prefix
./dist/index.js start           # Don't use './' prefix
```

## Start Chrome

```bash
browser-tools start              # Fresh profile
browser-tools start --profile    # Copy user's profile (cookies, logins)
browser-tools start --headless   # Run in headless mode
```

Launch Chrome with remote debugging on `:9222`. Use `--profile` to preserve user's authentication state.

## Navigate

```bash
bt nav https://google.com
bt nav https://google.com --new
bt navigate https://google.com
bt navigate https://google.com --new
```

Navigate to URLs. Use `--new` flag to open in a new tab instead of reusing current tab. `navigate` is an alias for `nav`.

## Evaluate JavaScript

```bash
browser-tools eval 'document.title'
browser-tools eval 'document.querySelectorAll("a").length'
```

Execute JavaScript in the active tab. Code runs in async context. Use this to extract data, inspect page state, or perform DOM operations programmatically.

## Screenshot

```bash
browser-tools screenshot
```

Capture current viewport and return temporary file path. Use this to visually inspect page state or verify UI changes.

## Pick Elements

```bash
browser-tools pick "Click the submit button"
```

**IMPORTANT**: Use this tool when the user wants to select specific DOM elements on the page. This launches an interactive picker that lets the user click elements to select them. The user can select multiple elements (Cmd/Ctrl+Click) and press Enter when done. The tool returns CSS selectors for the selected elements.

Common use cases:
- User says "I want to click that button" → Use this tool to let them select it
- User says "extract data from these items" → Use this tool to let them select the elements
- When you need specific selectors but the page structure is complex or ambiguous

## Cookies

```bash
browser-tools cookies
```

Display all cookies for the current tab including domain, path, httpOnly, and secure flags. Use this to debug authentication issues or inspect session state.

## Search Google

```bash
browser-tools search "rust programming"
browser-tools search "climate change" -n 10
browser-tools search "machine learning" -n 3 --content
```

Search Google and return results. Options:
- `-n <num>` - Number of results (default: 5, supports pagination for higher numbers)
- `--content` - Fetch and extract readable content as markdown from each result

## Extract Page Content

```bash
browser-tools content https://google.com
```

Navigate to a URL and extract readable content as markdown. Uses Mozilla Readability for article extraction and Turndown for HTML-to-markdown conversion. Works on pages with JavaScript content (waits for page to load).

## Search + Content Strategies

**Use `browser-tools search --content`** when you want content from all search results in one go. This is faster but fetches content from possibly irrelevant results.

```bash
browser-tools search "climate change effects" -n 3 --content
```

**Use `browser-tools search` + `browser-tools content`** when you want to selectively fetch content from only relevant results. First search, review the titles/snippets, then fetch content only for promising URLs.

```bash
browser-tools search "climate change effects" -n 10
# Review results, then fetch specific ones:
browser-tools content https://relevant-article.com
browser-tools content https://another-good-source.com
```
