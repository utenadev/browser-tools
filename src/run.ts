import { Browser } from 'puppeteer-core';
import yargs, { Yargs } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { close } from './browser-start.js';
import { getChromePath } from './utils/browser-utils.js';
import puppeteer from 'puppeteer-core';

import { handleError } from './utils/error-handler.js';

interface RunArgs {
  command: string;
  profile?: boolean;
  headless?: boolean;
  chromePath?: string;
  channel?: string;
}

export const command = 'run <command>';
export const description = 'Run a single command in a temporary browser instance';

export const builder = (yargs: Yargs) => {
  return yargs
    .positional('command', {
      type: 'string',
      description: 'The browser-tools command to execute, enclosed in quotes.',
    })
    .option('channel', {
      type: 'string',
      description: 'Chrome channel to use',
      default: 'stable',
    })
    .option('headless', {
      type: 'boolean',
      description: 'Run in headless mode',
    })
    .option('chrome-path', {
      type: 'string',
      description: 'Specify Chrome executable path',
    })
    .example(
      '$0 run "content https://example.com"',
      'Launch a browser, extract content, and close.'
    )
    .example(
      '$0 run --headless "screenshot page.png --url https://example.com"',
      'Run in headless mode to take a screenshot.'
    );
};

export const handler = async (argv: RunArgs, commandsMap: any = {}): Promise<void> => {
  let browser: Browser | undefined;
  try {
    // 1. Start a new browser instance
    console.log('---');
    console.log('🚀 Starting temporary browser for command...');
    const chromePath = argv.chromePath || getChromePath(argv.channel);
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: argv.headless ?? true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    console.log('Browser launched');

    // 2. Parse and execute the subcommand
    const commandString = argv.command.trim();
    const parts = commandString.split(/\s+/);
    const subCommandName = parts[0];

    if (!subCommandName || !commandsMap[subCommandName]) {
      throw new Error(`Unknown command provided to 'run': ${subCommandName}`);
    }

    console.log(`🏃 Executing: ${subCommandName}...`);
    console.log('---');

    // 3. Create a new page for the command
    const page = await browser.newPage();

    // 4. Find and run the actual command handler
    const commandToRun = commandsMap[subCommandName];

    // Create argv for the subcommand
    const subArgv: any = {
      _: parts.slice(1), // remaining parts as positional args
      browserInstance: browser,
      pageInstance: page,
      // Add other defaults if needed
    };

    // Set specific args based on command
    switch (subCommandName) {
      case 'content':
        subArgv.url = parts[1];
        break;
      case 'navigate':
        subArgv.url = parts[1];
        break;
      case 'screenshot':
        subArgv.path = parts[1];
        const urlIndex = parts.indexOf('--url');
        if (urlIndex !== -1) {
          subArgv.url = parts[urlIndex + 1];
        }
        break;
    }

    await commandToRun.handler(subArgv);
    
    console.log('---');
    console.log(`✅ Command finished: ${subCommandName}`);

  } catch (error) {
    handleError(error, `in 'run' command`);
  } finally {
    // 4. Ensure the browser is closed
    if (browser) {
      console.log('🛑 Closing temporary browser...');
      await browser.close();
      console.log('---');
    }
  }
};
