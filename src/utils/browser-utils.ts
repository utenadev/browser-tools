import puppeteer, { Browser, Page } from 'puppeteer-core';
import { BrowserToolsError } from './error-handler';
import { loadPid } from '../config.js';

export async function connectToBrowser(): Promise<Browser> {
  let browserURL = "http://127.0.0.1:9222";
  try {
    const pidInfo = await loadPid();
    if (pidInfo && pidInfo.browserURL) {
      browserURL = pidInfo.browserURL;
    }
  } catch (e) {
    // Ignore if pid file doesn't exist or is invalid, use default
  }

  try {
    const b = await Promise.race([
      puppeteer.connect({
        browserURL,
        defaultViewport: null,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
    ]);
    return b;
  } catch (error) {
    throw new BrowserToolsError(`Could not connect to browser: ${error instanceof Error ? error.message : 'Unknown error'}`, 'Run: browser-tools start');
  }
}

export async function getActivePage(browser: Browser): Promise<Page> {
  const pages = await browser.pages();
  const page = pages.at(-1);
  if (!page) {
    throw new BrowserToolsError('No active tab found');
  }
  return page;
}

export function getChromePath(channel: string = 'stable'): string {
  const platform = process.platform;
  if (platform === 'win32') {
    return channel === 'beta'
      ? 'C:\\Program Files\\Google\\Chrome Beta\\Application\\chrome.exe'
      : channel === 'dev'
        ? 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe'
        : channel === 'canary'
          ? 'C:\\Program Files\\Google\\Chrome SxS\\Application\\chrome.exe'
          : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else if (platform === 'darwin') {
    return channel === 'beta'
      ? '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta'
      : channel === 'dev'
        ? '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev'
        : channel === 'canary'
          ? '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
          : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    // Linux
    return channel === 'beta'
      ? '/usr/bin/google-chrome-beta'
      : channel === 'dev'
        ? '/usr/bin/google-chrome-unstable'
        : channel === 'canary'
          ? '/usr/bin/google-chrome-canary'
          : '/usr/bin/google-chrome-stable';
  }
}