import puppeteer, { Browser, Page } from 'puppeteer-core';
import { BrowserToolsError } from './error-handler';

export async function connectToBrowser(): Promise<Browser> {
  try {
    const b = await Promise.race([
      puppeteer.connect({
        browserURL: "http://localhost:9222",
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