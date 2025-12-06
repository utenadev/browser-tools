#!/usr/bin/env bun

import { start, checkConnection } from './browser-start.js';
import { content } from './browser-content.js';
import { cookies } from './browser-cookies.js';
import { evalCode } from './browser-eval.js';
import { hnScraper } from './browser-hn-scraper.js';
import { nav } from './browser-nav.js';
import { pick } from './browser-pick.js';
import { screenshot } from './browser-screenshot.js';
import { search } from './browser-search.js';

const printGlobalHelp = () => {
	console.log('Browser Tools - Chrome DevTools Protocol tools for agent-assisted web automation');
	console.log('');
	console.log('Usage: browser-tools <command> [options]');
	console.log('');
	console.log('Commands:');
	console.log('  start     Start Chrome with remote debugging');
	console.log('  nav       Navigate to a URL');
	console.log('  eval      Evaluate JavaScript in the active tab');
	console.log('  content   Extract readable content from a URL');
	console.log('  search    Search Google');
	console.log('  screenshot Capture screenshot of current viewport');
	console.log('  pick      Interactive element picker');
	console.log('  cookies   Display cookies for current tab');
	console.log('  hn-scraper Scrape Hacker News');
	console.log('');
	console.log('Run "browser-tools <command> --help" for more information on a command.');
	console.log('Note: Most commands require Chrome to be started first with "browser-tools start".');
};

const printStartHelp = () => {
	console.log('Start Chrome with remote debugging on :9222');
	console.log('');
	console.log('Usage: browser-tools start [options]');
	console.log('');
	console.log('Options:');
	console.log('  --profile          Copy user profile (cookies, logins)');
	console.log('  --headless         Run in headless mode');
	console.log('  --chrome-path <path> Specify Chrome executable path');
	console.log('  --channel <channel>  Chrome release channel (stable, beta, dev, canary)');
	console.log('  --help             Show this help');
	console.log('');
	console.log('Examples:');
	console.log('  browser-tools start');
	console.log('  browser-tools start --profile --headless');
	console.log('  browser-tools start --channel dev');
};

const cmd = process.argv[2];

if (cmd === '--help' || !cmd) {
  printGlobalHelp();
  process.exit(0);
}

if (cmd === 'start') {
  const args = process.argv.slice(3);
  if (args.includes('--help')) {
    printStartHelp();
    process.exit(0);
  }
  const useProfile = args.includes('--profile');
  const headless = args.includes('--headless');
  const chromePathIndex = args.indexOf('--chrome-path');
  const chromePath = chromePathIndex !== -1 && args[chromePathIndex + 1] ? args[chromePathIndex + 1] : undefined;
  const channelIndex = args.indexOf('--channel');
  const channel = channelIndex !== -1 && args[channelIndex + 1] ? args[channelIndex + 1] : 'stable';
  await start(useProfile, chromePath, channel, headless);
} else {
  // Check if Chrome is running
  const isConnected = await checkConnection();
  if (!isConnected) {
    console.error('✗ Chrome is not running. Please start Chrome first with "browser-tools start".');
    process.exit(1);
  }

  if (cmd === 'content') {
    const url = process.argv[3];
    if (!url || process.argv[3] === '--help') {
      console.log('Extract readable content from a URL');
      console.log('');
      console.log('Usage: browser-tools content <url>');
      console.log('');
      console.log('Examples:');
      console.log('  browser-tools content https://example.com');
      process.exit(1);
    }
    await content(url);
  } else if (cmd === 'cookies') {
    if (process.argv[3] === '--help') {
      console.log('Display all cookies for the current tab');
      console.log('');
      console.log('Usage: browser-tools cookies');
      process.exit(0);
    }
    await cookies();
  } else if (cmd === 'eval') {
    const code = process.argv.slice(3).join(' ');
    if (!code || process.argv[3] === '--help') {
      console.log('Execute JavaScript in the active tab');
      console.log('');
      console.log('Usage: browser-tools eval <code>');
      console.log('');
      console.log('Examples:');
      console.log('  browser-tools eval "document.title"');
      console.log('  browser-tools eval "document.querySelectorAll(\'a\').length"');
      process.exit(1);
    }
    await evalCode(code);
  } else if (cmd === 'hn-scraper') {
    if (process.argv[3] === '--help') {
      console.log('Scrape Hacker News stories');
      console.log('');
      console.log('Usage: browser-tools hn-scraper [limit]');
      console.log('');
      console.log('Options:');
      console.log('  limit  Number of stories to scrape (default: 30)');
      process.exit(0);
    }
    const limit = process.argv[3] ? parseInt(process.argv[3]) : 30;
    await hnScraper(limit);
  } else if (cmd === 'nav') {
    const url = process.argv[3];
    if (!url || process.argv[3] === '--help') {
      console.log('Navigate to a URL');
      console.log('');
      console.log('Usage: browser-tools nav <url> [--new]');
      console.log('');
      console.log('Options:');
      console.log('  --new  Open in a new tab');
      console.log('');
      console.log('Examples:');
      console.log('  browser-tools nav https://example.com');
      console.log('  browser-tools nav https://example.com --new');
      process.exit(1);
    }
    const newTab = process.argv[4] === '--new';
    await nav(url, newTab);
  } else if (cmd === 'pick') {
    const message = process.argv.slice(3).join(' ');
    if (!message || process.argv[3] === '--help') {
      console.log('Interactive element picker');
      console.log('');
      console.log('Usage: browser-tools pick <message>');
      console.log('');
      console.log('Examples:');
      console.log('  browser-tools pick "Click the submit button"');
      process.exit(1);
    }
    await pick(message);
  } else if (cmd === 'screenshot') {
    if (process.argv[3] === '--help') {
      console.log('Capture screenshot of current viewport');
      console.log('');
      console.log('Usage: browser-tools screenshot');
      process.exit(0);
    }
    await screenshot();
  } else if (cmd === 'search') {
    const args = process.argv.slice(3);
    if (args.includes('--help')) {
      console.log('Search Google and return results');
      console.log('');
      console.log('Usage: browser-tools search <query> [-n <num>] [--content]');
      console.log('');
      console.log('Options:');
      console.log('  -n <num>     Number of results (default: 5)');
      console.log('  --content    Fetch content from each result');
      console.log('');
      console.log('Examples:');
      console.log('  browser-tools search "puppeteer"');
      console.log('  browser-tools search "climate change" -n 10 --content');
      process.exit(0);
    }
    const contentIndex = args.indexOf('--content');
    const fetchContent = contentIndex !== -1;
    if (fetchContent) args.splice(contentIndex, 1);

    let numResults = 5;
    const nIndex = args.indexOf('-n');
    if (nIndex !== -1 && args[nIndex + 1]) {
      numResults = parseInt(args[nIndex + 1]);
      args.splice(nIndex, 2);
    }

    const query = args.join(' ');
    if (!query) {
      console.log('Usage: browser-tools search <query> [-n <num>] [--content]');
      process.exit(1);
    }
    await search(query, numResults, fetchContent);
  } else {
    console.log(`Unknown command: ${cmd}`);
    printGlobalHelp();
    process.exit(1);
  }
}



if (cmd === 'start') {
  const args = process.argv.slice(3);
  const useProfile = args.includes('--profile');
  const headless = args.includes('--headless');
  const chromePathIndex = args.indexOf('--chrome-path');
  const chromePath = chromePathIndex !== -1 && args[chromePathIndex + 1] ? args[chromePathIndex + 1] : undefined;
  const channelIndex = args.indexOf('--channel');
  const channel = channelIndex !== -1 && args[channelIndex + 1] ? args[channelIndex + 1] : 'stable';
  await start(useProfile, chromePath, channel, headless);
} else if (cmd === 'content') {
  const url = process.argv[3];
  if (!url) {
    console.log('Usage: bt content <url>');
    process.exit(1);
  }
  await content(url);
} else if (cmd === 'cookies') {
  await cookies();
} else if (cmd === 'eval') {
  const code = process.argv.slice(3).join(' ');
  if (!code) {
    console.log('Usage: bt eval <code>');
    process.exit(1);
  }
  await evalCode(code);
} else if (cmd === 'hn-scraper') {
  const limit = process.argv[3] ? parseInt(process.argv[3]) : 30;
  await hnScraper(limit);
} else if (cmd === 'nav') {
  const url = process.argv[3];
  const newTab = process.argv[4] === '--new';
  if (!url) {
    console.log('Usage: bt nav <url> [--new]');
    process.exit(1);
  }
  await nav(url, newTab);
} else if (cmd === 'pick') {
  const message = process.argv.slice(3).join(' ');
  if (!message) {
    console.log('Usage: bt pick <message>');
    process.exit(1);
  }
  await pick(message);
} else if (cmd === 'screenshot') {
  await screenshot();
} else if (cmd === 'search') {
  const args = process.argv.slice(3);
  const contentIndex = args.indexOf('--content');
  const fetchContent = contentIndex !== -1;
  if (fetchContent) args.splice(contentIndex, 1);

  let numResults = 5;
  const nIndex = args.indexOf('-n');
  if (nIndex !== -1 && args[nIndex + 1]) {
    numResults = parseInt(args[nIndex + 1]);
    args.splice(nIndex, 2);
  }

  const query = args.join(' ');
  if (!query) {
    console.log('Usage: bt search <query> [-n <num>] [--content]');
    process.exit(1);
  }
  await search(query, numResults, fetchContent);
} else {
  console.log('Usage: bt <command> [options]');
  console.log('Commands: start, content, cookies, eval, hn-scraper, nav, pick, screenshot, search');
  process.exit(1);
}