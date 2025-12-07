// src/commands.ts
import * as navigate from './browser-navigate.js';
import * as screenshot from './browser-screenshot.js';
import * as content from './browser-content.js';
import * as browserEval from './browser-eval.js';
import * as search from './browser-search.js';
import * as pick from './browser-pick.js';
import * as cookies from './browser-cookies.js';
import * as hnScraper from './browser-hn-scraper.js';

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
  [browserEval.command.split(' ')[0]]: {
    command: browserEval.command,
    description: browserEval.description,
    builder: browserEval.builder,
    handler: browserEval.handler,
  },
  [search.command.split(' ')[0]]: {
    command: search.command,
    description: search.description,
    builder: search.builder,
    handler: search.handler,
  },
  [pick.command.split(' ')[0]]: {
    command: pick.command,
    description: pick.description,
    builder: pick.builder,
    handler: pick.handler,
  },
  [cookies.command.split(' ')[0]]: {
    command: cookies.command,
    description: cookies.description,
    builder: cookies.builder,
    handler: cookies.handler,
  },
  [hnScraper.command.split(' ')[0]]: {
    command: hnScraper.command,
    description: hnScraper.description,
    builder: hnScraper.builder,
    handler: hnScraper.handler,
  },
};
