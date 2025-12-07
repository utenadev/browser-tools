import { Browser } from 'puppeteer-core';
import yargs, { Yargs } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { start, close, startBuilder } from './browser-start.js';
import { commands } from './commands.js';
import { handleError } from './utils/error-handler.js';
import { getChromePath } from './utils/browser-utils.js';

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
  // Apply the start options (like --headless, --profile) to the run command
  const yargsWithStartOptions = startBuilder(yargs);
  
  return yargsWithStartOptions
    .positional('command', {
      type: 'string',
      description: 'The browser-tools command to execute, enclosed in quotes.',
    })
    .example(
      '$0 run "screenshot my-page.png --url https://example.com"', 
      'Launch a browser, take a screenshot, and close.'
    )
    .example(
      '$0 run --headless "content https://example.com/article"', 
      'Run in headless mode to extract content.'
    );
};

export const handler = async (argv: RunArgs): Promise<void> => {
  let browser: Browser | undefined;
  try {
    // 1. Start a new browser instance
    console.log('---');
    console.log('🚀 Starting temporary browser for command...');
    browser = await start({
      profile: argv.profile,
      headless: argv.headless,
      chromePath: argv.chromePath,
      channel: argv.channel,
    });

    // 2. Parse and execute the subcommand
    const commandString = argv.command;
    
    // Use a new yargs instance to parse the inner command
    const subYargs = yargs(hideBin(process.argv));
    
    // Register all available commands on this temporary yargs instance
    // so it knows how to parse the command string.
    for (const key in commands) {
      const cmd = commands[key as keyof typeof commands];
      subYargs.command(cmd.command, cmd.description, cmd.builder, () => {});
    }

    // Parse the command string
    const parsedArgv = await subYargs.parse(commandString);
    const subCommandName = parsedArgv._[0]?.toString();

    if (!subCommandName || !commands[subCommandName]) {
      throw new Error(`Unknown command provided to 'run': ${subCommandName}`);
    }
    
    console.log(`🏃 Executing: ${subCommandName}...`);
    console.log('---');

    // 3. Find and run the actual command handler
    const commandToRun = commands[subCommandName as keyof typeof commands];
    await commandToRun.handler({ ...parsedArgv, browserInstance: browser });
    
    console.log('---');
    console.log(`✅ Command finished: ${subCommandName}`);

  } catch (error) {
    handleError(error, `in 'run' command`);
  } finally {
    // 4. Ensure the browser is closed
    if (browser) {
      console.log('🛑 Closing temporary browser...');
      await close(browser);
      console.log('---');
    }
  }
};
