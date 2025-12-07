import { Browser } from 'puppeteer-core';
import { Yargs } from 'yargs';
import { handleError } from './utils/error-handler.js';
import { connectToBrowser, getActivePage } from './utils/browser-utils.js';

interface NavigateArgs {
  url: string;
  new?: boolean;
  browserInstance?: Browser;
}

export const command = 'navigate <url>';
export const description = 'Navigate to a URL';

export const builder = (yargs: Yargs) => {
  return yargs
    .positional('url', {
      type: 'string',
      description: 'URL to navigate to',
    })
    .option('new', {
      type: 'boolean',
      description: 'Open in a new tab',
      default: false,
    })
    .example('$0 navigate https://example.com', 'Navigate to example.com')
    .example('$0 navigate https://example.com --new', 'Open example.com in new tab');
};

export const handler = async (argv: NavigateArgs): Promise<void> => {
  const shouldDisconnect = !argv.browserInstance;
  let browser: Browser | undefined = argv.browserInstance;

  try {
    if (!browser) {
      browser = await connectToBrowser();
    }
    if (!browser) {
      throw new Error('Could not connect to browser.');
    }

    if (argv.new) {
      const page = await browser.newPage();
      await page.goto(argv.url, { waitUntil: 'domcontentloaded' });
      console.log('✓ Opened:', argv.url);
    } else {
      const page = await getActivePage(browser);
      await page.goto(argv.url, { waitUntil: 'domcontentloaded' });
      console.log('✓ Navigated to:', argv.url);
    }
  } catch (error) {
    handleError(error, `Navigating to ${argv.url}`);
  } finally {
    if (shouldDisconnect && browser) {
      await browser.disconnect();
    }
  }
};
