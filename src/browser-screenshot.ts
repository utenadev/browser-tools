import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Browser } from 'puppeteer-core';
import { Yargs } from 'yargs';
import { handleError } from './utils/error-handler.js';
import { connectToBrowser, getActivePage } from './utils/browser-utils.js';

interface ScreenshotArgs {
  path?: string;
  url?: string;
  fullPage?: boolean;
  browserInstance?: Browser;
}

export const command = 'screenshot [path]';
export const description = 'Capture a screenshot of a web page';

export const builder = (yargs: Yargs) => {
  return yargs
    .positional('path', {
      type: 'string',
      description: 'File path to save the screenshot. If omitted, a temporary file is created.',
    })
    .option('url', {
      type: 'string',
      description: 'URL to navigate to before taking the screenshot.',
    })
    .option('full-page', {
      type: 'boolean',
      description: 'Capture a full-page screenshot.',
      default: false,
    })
    .example('$0 screenshot', 'Capture the current view and save to a temporary file')
    .example('$0 screenshot my-shot.png', 'Capture the current view and save to my-shot.png')
    .example('$0 screenshot my-shot.png --url https://example.com', 'Navigate to a URL and then take a screenshot');
};

export const handler = async (argv: ScreenshotArgs): Promise<void> => {
  const shouldDisconnect = !argv.browserInstance;
  let browser: Browser | undefined = argv.browserInstance;

  try {
    if (!browser) {
      browser = await connectToBrowser();
    }
    if (!browser) {
      throw new Error('Could not connect to browser.');
    }

    const page = await getActivePage(browser);

    if (argv.url) {
      await page.goto(argv.url, { waitUntil: 'domcontentloaded' });
      console.log('✓ Navigated to:', argv.url);
    }

    const filePath = argv.path || join(tmpdir(), `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`);

    await page.screenshot({ path: filePath, fullPage: argv.fullPage });

    console.log(`✓ Screenshot saved to: ${filePath}`);
  } catch (error) {
    handleError(error, 'Taking screenshot');
  } finally {
    if (shouldDisconnect && browser) {
      await browser.disconnect();
    }
  }
};