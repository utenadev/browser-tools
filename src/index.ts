#!/usr/bin/env bun

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { start, close, checkConnection, startBuilder } from './browser-start.js';
import * as run from './run.js';
import { commands } from './commands.js';
import { loadConfig } from './config.js';

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
yargsInstance.command(run.command, run.description, run.builder, run.handler);

// --- Refactored commands ---
// Register all commands from the centralized map
for (const key in commands) {
  const cmd = commands[key as keyof typeof commands];
  yargsInstance.command(cmd.command, cmd.description, cmd.builder, cmd.handler);
}

// --- Middleware & Finalization ---
yargsInstance.middleware(async (argv) => {
  // Check connection for commands that need a running browser,
  // excluding commands that manage the browser lifecycle themselves.
  const command = argv._[0];
  const needsConnectionCheck = command && !['start', 'run', 'close', 'help'].includes(command.toString());

  if (process.env.NODE_ENV !== 'test' && process.env.BROWSER_TOOLS_TEST_MODE !== 'true' && needsConnectionCheck) {
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
