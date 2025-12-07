import { Browser } from 'puppeteer-core';
import { Yargs } from 'yargs';
import { htmlToMarkdown, extractContent } from './utils/content-extractor.js';
import { handleError } from './utils/error-handler.js';
import { connectToBrowser, getActivePage } from './utils/browser-utils.js';

type Format = 'markdown' | 'text' | 'html';

interface ContentArgs {
  url?: string;
  format?: Format;
  browserInstance?: Browser;
  pageInstance?: any;
}

export const command = 'content [url]';
export const description = 'Extract readable content from a web page';

export const builder = (yargs: Yargs) => {
  return yargs
    .positional('url', {
      type: 'string',
      description: 'URL to extract content from. If omitted, uses the current page.',
    })
    .option('format', {
      type: 'string',
      description: 'Output format',
      choices: ['markdown', 'text', 'html'],
      default: 'markdown',
    })
    .example('$0 content', 'Extract content from the current page')
    .example('$0 content https://example.com', 'Extract content from a URL');
};

export const handler = async (argv: ContentArgs): Promise<void> => {
  const shouldDisconnect = !argv.browserInstance;
  let browser: Browser | undefined = argv.browserInstance;
  
  try {
    if (!browser) {
      browser = await connectToBrowser();
    }
    if (!browser) {
      throw new Error('Could not connect to browser.');
    }

    const page = argv.pageInstance || await getActivePage(browser);
    let targetUrl = page.url();

    if (argv.url) {
      await page.goto(argv.url, { waitUntil: 'domcontentloaded' });
      targetUrl = argv.url;
      console.log('✓ Navigated to:', argv.url);
    }
    
    // Get HTML via page evaluation
    const outerHTML = await page.evaluate(() => document.documentElement.outerHTML);
    const finalUrl = page.url();

    const { title, content: extractedHtml } = extractContent(outerHTML, finalUrl);

    let output = '';
    switch (argv.format) {
      case 'html':
        output = extractedHtml;
        break;
      case 'text':
        // A simple conversion, could be improved
        output = extractedHtml.replace(/<[^>]+>/g, '');
        break;
      case 'markdown':
      default:
        output = htmlToMarkdown(extractedHtml);
        break;
    }

    console.log(`URL: ${finalUrl}`);
    if (title) console.log(`Title: ${title}`);
    console.log('\n---\n');
    console.log(output);

  } catch (error) {
    handleError(error, `Extracting content from ${argv.url || 'current page'}`);
  } finally {
    if (shouldDisconnect && browser) {
      await browser.disconnect();
    }
  }
};