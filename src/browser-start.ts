import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { Browser, launch, connect } from 'puppeteer-core';

import { savePid, loadPid, clearPid } from './config.js';
import { handleError } from './utils/error-handler.js';
import { getChromePath } from './utils/browser-utils.js';
import { Yargs } from 'yargs';
import { loadConfig } from './config.js';

const execAsync = promisify(exec);

interface StartArgs {
  profile?: boolean;
  headless?: boolean;
  chromePath?: string;
  channel?: string;
}

export const startBuilder = (yargs: Yargs) => {
  const config = loadConfig();
  return yargs
    .option('profile', {
      type: 'boolean',
      description: 'Copy user profile (cookies, logins)',
      default: config.profile,
    })
    .option('headless', {
      type: 'boolean',
      description: 'Run in headless mode',
      default: config.headless,
    })
    .option('chrome-path', {
      type: 'string',
      description: 'Specify Chrome executable path',
      default: config.chromePath,
    })
    .option('channel', {
      type: 'string',
      description: 'Chrome release channel (stable, beta, dev, canary)',
      default: config.channel || 'stable',
    });
};

/**
 * Launches a new Chrome instance.
 * @returns A connected Puppeteer Browser instance.
 */
export async function start(args: StartArgs): Promise<Browser> {
  const chromePath = args.chromePath || getChromePath(args.channel);
  const port = 9222; // Or a random available port
  const userDataDir = path.resolve(process.cwd(), '.browser-tools-profile');

  const launchArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
  ];
  if (args.headless) {
    launchArgs.push('--headless');
  }

  const isWindows = process.platform === 'win32';
  const command = isWindows
    ? `start "chrome" "${chromePath}" ${launchArgs.join(' ')}`
    : `"${chromePath}" ${launchArgs.join(' ')} &`;

  console.log(`DEBUG: chromePath = ${chromePath}`);
  console.log(`DEBUG: command = ${command}`);

  const { stdout, stderr } = await execAsync(command);
  if (stderr) {
    console.error(`✗ Error launching Chrome: ${stderr}`);
  }

  // Poll for the browser to initialize
  const maxRetries = 20; // 10 seconds total
  let browser: Browser | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const browserURL = `http://127.0.0.1:${port}`;
      browser = await connect({ browserURL, defaultViewport: null });
      if (browser) break;
    } catch (e) {
      if (i === maxRetries - 1) {
        console.error(`✗ Failed to connect after ${maxRetries} attempts.`);
        throw e;
      }
    }
  }

  if (!browser) {
    throw new Error('Failed to connect to browser after retries');
  }

  try {
    const browserURL = `http://127.0.0.1:${port}`;
    // already connected above, but we need the object if we didn't assign it (we did)

    const pid = browser.process()?.pid;

    if (pid) {
      savePid(pid, browserURL, userDataDir, chromePath);
      console.log(`✓ Chrome started with PID: ${pid} on port ${port}.`);
    } else {
      // Fallback for when browser.process() is not available
      try {
        const pidInfo = await loadPid();
        console.log(`✓ Chrome started on port ${port}. PID not directly available, managed externally.`);
      } catch (e) {
        // loadPid might fail if file doesn't exist, which is fine
        console.log(`✓ Chrome started on port ${port}.`);
      }
    }

    return browser;
  } catch (e) {
    console.error('✗ Could not connect to started Chrome instance. It might have failed to launch.');
    throw e;
  }
}

/**
 * Closes a Chrome instance.
 * @param browserOrPid A Puppeteer Browser instance or a process ID.
 */
export async function close(browserOrPid?: Browser | number): Promise<void> {
  if (browserOrPid && typeof browserOrPid !== 'number') {
    const pid = browserOrPid.process()?.pid;
    await browserOrPid.close();
    if (pid) {
      console.log(`✓ Closed Chrome instance with PID: ${pid}.`);
    } else {
      console.log('✓ Closed Chrome instance.');
    }
    clearPid();
    return;
  }

  try {
    const pidInfo = await loadPid();
    const pidToKill = typeof browserOrPid === 'number' ? browserOrPid : pidInfo.pid;

    if (pidToKill) {
      process.kill(pidToKill);
      console.log(`✓ Closed Chrome instance with PID: ${pidToKill}.`);
    } else {
      console.log('✓ No active Chrome instance PID found to close.');
    }
  } catch (error) {
    // Ignore errors if the process is already gone
  } finally {
    clearPid();
  }
}

export async function checkConnection(): Promise<boolean> {
  try {
    const pidInfo = await loadPid();
    if (!pidInfo.browserURL) return false;

    const browser = await connect({ browserURL: pidInfo.browserURL });
    await browser.disconnect();
    return true;
  } catch (error) {
    return false;
  }
}