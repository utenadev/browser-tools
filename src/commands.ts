// src/commands.ts
import * as navigate from './browser-navigate.js';
import * as screenshot from './browser-screenshot.js';
import * as content from './browser-content.js';

// This map centralizes all command definitions for the application.
// It is used by index.ts to build the CLI and by run.ts to execute subcommands.
export const commands = {
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
