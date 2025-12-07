#!/usr/bin/env bun

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { start, close, checkConnection, startBuilder } from './browser-start.js';
import * as run from './run.js';

import { loadConfig } from './config.js';

// TODO: Refactor these commands to the new structure
import * as navigate from './browser-navigate.js';
import * as screenshot from './browser-screenshot.js';
import * as content from './browser-content.js';
import { cookies } from './browser-cookies.js';
import { evalCode } from './browser-eval.js';
import { hnScraper } from './browser-hn-scraper.js';
import { pick } from './browser-pick.js';
import { search } from './browser-search.js';

// Centralized command definitions
const commands = {
  [navigate.command.split(' ')[0]]: {
    command: navigate.command,
    description: navigate.description,
    builder: navigate.builder,
    handler: navigate.handler,
  },
  [screenshot.command.split(' ')[0]]: {
    command: screenshot.command,
    description: screenshot.description,
    builder: screenshot.builder,
    handler: screenshot.handler,
  },
  [content.command.split(' ')[0]]: {
    command: content.command,
    description: content.description,
    builder: content.builder,
    handler: content.handler,
  },
  // Other commands like 'eval', 'search', etc. will be added here
  // once they are refactored to the new structure.
};

// Main yargs setup
const yargsInstance = yargs(hideBin(process.argv))
  .scriptName('browser-tools')
  .usage('Browser Tools - Chrome DevTools Protocol tools for agent-assisted web automation\n\nUsage: $0 <command> [options]');

// --- Persistent session commands ---
yargsInstance.command(
  'start', 
  'Start a persistent Chrome instance',
  startBuilder, // Use the builder from browser-start
  async (argv) => {
    // We only need to call start without expecting a return value for the CLI
    await start(argv);
  }
);
yargsInstance.command(
  'close', 
  'Close the persistent Chrome instance',
  {}, // No builder options
  async () => {
    await close();
  }
);

// --- Single-run command ---
yargsInstance.command(run.command, run.description, run.builder, (argv) => run.handler(argv, commands));

// --- Refactored commands ---
// Register all commands from the centralized map
for (const key in commands) {
  const cmd = commands[key];
  yargsInstance.command(cmd.command, cmd.description, cmd.builder, cmd.handler);
}


// --- TODO: Old commands to be refactored ---
yargsInstance.command('eval <code>', 'Execute JavaScript in the active tab', (yargs) => {
  return yargs
    .positional('code', {
      type: 'string',
      description: 'JavaScript code to execute',
    })
}, async (argv) => { await evalCode(argv.code as string); });

yargsInstance.command('search <query>', 'Search Google and return results', (yargs) => {
  return yargs
    .positional('query', { type: 'string', description: 'Search query' })
    .option('n', { type: 'number', description: 'Number of results', default: 5 })
    .option('content', { type: 'boolean', description: 'Fetch content from each result' });
}, async (argv) => { await search(argv.query as string, argv.n, argv.content); });

yargsInstance.command('pick <message>', 'Interactive element picker', (yargs) => {
  return yargs.positional('message', { type: 'string', description: 'Message to display' });
}, async (argv) => { await pick(argv.message as string); });

yargsInstance.command('cookies', 'Display cookies for current tab', {}, async () => { await cookies(); });
yargsInstance.command('hn-scraper [limit]', 'Scrape Hacker News stories', (yargs) => {
  return yargs.positional('limit', { type: 'number', default: 30 });
}, async (argv) => { await hnScraper(argv.limit as number); });


// --- Middleware & Finalization ---
yargsInstance.middleware(async (argv) => {
  // Check connection for commands that need a running browser,
  // excluding commands that manage the browser lifecycle themselves.
  const command = argv._[0];
  const needsConnectionCheck = command && !['start', 'run', 'close', 'help'].includes(command.toString());
  
  if (process.env.NODE_ENV !== 'test' && needsConnectionCheck) {
    const isConnected = await checkConnection();
    if (!isConnected) {
      console.error('✗ Chrome is not running. Please start it first with "browser-tools start" or use the "run" command for atomic operations.');
      process.exit(1);
    }
  }
})
.demandCommand(1, 'You need at least one command before moving on')
.strict()
.help()
.argv;
