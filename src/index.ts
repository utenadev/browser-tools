#!/usr/bin/env node

import { start } from './browser-start.js';
import { content } from './browser-content.js';
import { cookies } from './browser-cookies.js';
import { evalCode } from './browser-eval.js';
import { hnScraper } from './browser-hn-scraper.js';
import { nav } from './browser-nav.js';
import { pick } from './browser-pick.js';
import { screenshot } from './browser-screenshot.js';
import { search } from './browser-search.js';

const cmd = process.argv[2];

if (cmd === 'start') {
  const useProfile = process.argv[3] === '--profile';
  await start(useProfile);
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