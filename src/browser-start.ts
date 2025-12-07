import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Browser, launch, connect } from 'puppeteer-core';

import { savePid, loadPid, clearPid } from './config.js';
import { handleError } from './utils/error-handler.js';
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
  const userDataDir = '.browser-tools-profile';
  
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

  const { stdout, stderr } = await execAsync(command);
  if (stderr) {
    console.error(`✗ Error launching Chrome: ${stderr}`);
  }

  // Wait a moment for the browser to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const browserURL = `http://127.0.0.1:${port}`;
    const browser = await connect({ browserURL, defaultViewport: null });
    const pid = browser.process()?.pid;

    if (pid) {
      savePid(pid, browserURL, userDataDir, chromePath);
      console.log(`✓ Chrome started with PID: ${pid} on port ${port}.`);
    } else {
      // Fallback for when browser.process() is not available
      const pidInfo = await loadPid();
      console.log(`✓ Chrome started on port ${port}. PID not directly available, managed externally.`);
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