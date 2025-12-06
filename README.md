# Browser Tools

Chrome DevTools Protocol tools for agent-assisted web automation. These tools connect to Chrome running on `:9222` with remote debugging enabled.

## Installation

```bash
bun install
bun build src/index.ts --outdir dist --target node
```

Then use `bt` command.

## How to Invoke These Tools

**CRITICAL FOR AGENTS**: Use the `bt` command with subcommands. When invoking via the Bash tool:

✓ CORRECT:
```bash
bt start
bt nav https://example.com
bt pick "Click the button"
```

✗ INCORRECT:
```bash
node dist/index.js start        # Don't use 'node' prefix
./dist/index.js start           # Don't use './' prefix
```

## Start Chrome

```bash
bt start              # Fresh profile
bt start --profile    # Copy user's profile (cookies, logins)
```

Launch Chrome with remote debugging on `:9222`. Use `--profile` to preserve user's authentication state.

## Navigate

```bash
bt nav https://google.com
bt nav https://google.com --new
```

Navigate to URLs. Use `--new` flag to open in a new tab instead of reusing current tab.

## Evaluate JavaScript

```bash
bt eval 'document.title'
bt eval 'document.querySelectorAll("a").length'
```

Execute JavaScript in the active tab. Code runs in async context. Use this to extract data, inspect page state, or perform DOM operations programmatically.

## Screenshot

```bash
bt screenshot
```

Capture current viewport and return temporary file path. Use this to visually inspect page state or verify UI changes.

## Pick Elements

```bash
bt pick "Click the submit button"
```

**IMPORTANT**: Use this tool when the user wants to select specific DOM elements on the page. This launches an interactive picker that lets the user click elements to select them. The user can select multiple elements (Cmd/Ctrl+Click) and press Enter when done. The tool returns CSS selectors for the selected elements.

Common use cases:
- User says "I want to click that button" → Use this tool to let them select it
- User says "extract data from these items" → Use this tool to let them select the elements
- When you need specific selectors but the page structure is complex or ambiguous

## Cookies

```bash
bt cookies
```

Display all cookies for the current tab including domain, path, httpOnly, and secure flags. Use this to debug authentication issues or inspect session state.

## Search Google

```bash
bt search "rust programming"
bt search "climate change" -n 10
bt search "machine learning" -n 3 --content
```

Search Google and return results. Options:
- `-n <num>` - Number of results (default: 5, supports pagination for higher numbers)
- `--content` - Fetch and extract readable content as markdown from each result

## Extract Page Content

```bash
bt content https://google.com
```

Navigate to a URL and extract readable content as markdown. Uses Mozilla Readability for article extraction and Turndown for HTML-to-markdown conversion. Works on pages with JavaScript content (waits for page to load).

## Search + Content Strategies

**Use `bt search --content`** when you want content from all search results in one go. This is faster but fetches content from possibly irrelevant results.

```bash
bt search "climate change effects" -n 3 --content
```

**Use `bt search` + `bt content`** when you want to selectively fetch content from only relevant results. First search, review the titles/snippets, then fetch content only for promising URLs.

```bash
bt search "climate change effects" -n 10
# Review results, then fetch specific ones:
bt content https://relevant-article.com
bt content https://another-good-source.com
```
