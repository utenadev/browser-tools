#!/usr/bin/env bun

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { start, checkConnection } from './browser-start.js';
import { content } from './browser-content.js';
import { cookies } from './browser-cookies.js';
import { evalCode } from './browser-eval.js';
import { hnScraper } from './browser-hn-scraper.js';
import { nav } from './browser-nav.js';
import { pick } from './browser-pick.js';
import { screenshot } from './browser-screenshot.js';
import { search } from './browser-search.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const argv = yargs(hideBin(process.argv))
  .scriptName('browser-tools')
  .usage('Browser Tools - Chrome DevTools Protocol tools for agent-assisted web automation\n\nUsage: $0 <command> [options]')
  .command('start', 'Start Chrome with remote debugging', (yargs) => {
    return yargs
      .option('profile', {
        type: 'boolean',
        description: 'Copy user profile (cookies, logins)',
        default: config.profile,
      })
      .option('headless', {
        type: 'boolean',
        description: 'Run in headless mode',
        default: config.headless,
      })
      .option('chrome-path', {
        type: 'string',
        description: 'Specify Chrome executable path',
        default: config.chromePath,
      })
      .option('channel', {
        type: 'string',
        description: 'Chrome release channel (stable, beta, dev, canary)',
        default: config.channel || 'stable',
      })
      .example('$0 start', 'Start Chrome with default settings')
      .example('$0 start --profile --headless', 'Start Chrome with profile in headless mode')
      .example('$0 start --channel dev', 'Start Chrome dev channel');
  }, async (argv) => {
    await start(argv.profile, argv.chromePath, argv.channel, argv.headless);
  })
  .command('nav <url>', 'Navigate to a URL', (yargs) => {
    return yargs
      .positional('url', {
        type: 'string',
        description: 'URL to navigate to',
      })
      .option('new', {
        type: 'boolean',
        description: 'Open in a new tab',
      })
      .example('$0 nav https://example.com', 'Navigate to example.com')
      .example('$0 nav https://example.com --new', 'Open example.com in new tab');
  }, async (argv) => {
    await nav(argv.url, argv.new);
  })
  .command('navigate <url>', 'Navigate to a URL', (yargs) => {
    return yargs
      .positional('url', {
        type: 'string',
        description: 'URL to navigate to',
      })
      .option('new', {
        type: 'boolean',
        description: 'Open in a new tab',
      })
      .example('$0 navigate https://example.com', 'Navigate to example.com')
      .example('$0 navigate https://example.com --new', 'Open example.com in new tab');
  }, async (argv) => {
    await nav(argv.url, argv.new);
  })
  .command('eval <code>', 'Execute JavaScript in the active tab', (yargs) => {
    return yargs
      .positional('code', {
        type: 'string',
        description: 'JavaScript code to execute',
      })
      .example('$0 eval "document.title"', 'Get page title')
      .example('$0 eval "document.querySelectorAll(\'a\').length"', 'Count links');
  }, async (argv) => {
    await evalCode(argv.code);
  })
  .command('content <url>', 'Extract readable content from a URL', (yargs) => {
    return yargs
      .positional('url', {
        type: 'string',
        description: 'URL to extract content from',
      })
      .example('$0 content https://example.com', 'Extract content from example.com');
  }, async (argv) => {
    await content(argv.url);
  })
  .command('search <query>', 'Search Google and return results', (yargs) => {
    return yargs
      .positional('query', {
        type: 'string',
        description: 'Search query',
      })
      .option('n', {
        type: 'number',
        description: 'Number of results (default: 5)',
        default: 5,
      })
      .option('content', {
        type: 'boolean',
        description: 'Fetch content from each result',
      })
      .example('$0 search "puppeteer"', 'Search for puppeteer')
      .example('$0 search "climate change" -n 10 --content', 'Search with content extraction');
  }, async (argv) => {
    await search(argv.query, argv.n, argv.content);
  })
  .command('screenshot', 'Capture screenshot of current viewport', (yargs) => {
    return yargs
      .example('$0 screenshot', 'Take screenshot');
  }, async () => {
    await screenshot();
  })
  .command('pick <message>', 'Interactive element picker', (yargs) => {
    return yargs
      .positional('message', {
        type: 'string',
        description: 'Message to display in picker',
      })
      .example('$0 pick "Click the submit button"', 'Start element picker');
  }, async (argv) => {
    await pick(argv.message);
  })
  .command('cookies', 'Display cookies for current tab', (yargs) => {
    return yargs
      .example('$0 cookies', 'Show cookies');
  }, async () => {
    await cookies();
  })
  .command('hn-scraper [limit]', 'Scrape Hacker News stories', (yargs) => {
    return yargs
      .positional('limit', {
        type: 'number',
        description: 'Number of stories to scrape (default: 30)',
        default: 30,
      })
      .example('$0 hn-scraper', 'Scrape 30 stories')
      .example('$0 hn-scraper 50', 'Scrape 50 stories');
  }, async (argv) => {
    await hnScraper(argv.limit);
  })
  .middleware(async (argv) => {
    // Check connection for commands other than start
    if (argv._[0] !== 'start') {
      const isConnected = await checkConnection();
      if (!isConnected) {
        console.error('✗ Chrome is not running. Please start Chrome first with "browser-tools start".');
        process.exit(1);
      }
    }
  })
  .help()
  .argv;