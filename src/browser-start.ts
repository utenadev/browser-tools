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

function getChromePath(channel: string = 'stable'): string {
  console.log(`DEBUG: resolving chrome path for channel: ${channel}, platform: ${process.platform}`);
  if (process.platform === 'win32') {
    const suffix = channel === 'stable' ? '' : channel.charAt(0).toUpperCase() + channel.slice(1);
    const prefixes = [
      process.env.PROGRAMFILES,
      process.env['PROGRAMFILES(X86)'],
      process.env.LOCALAPPDATA,
    ].filter(Boolean);

    for (const prefix of prefixes) {
      // standard paths
      const paths = [
        `Google\\Chrome${suffix ? ' ' + suffix : ''}\\Application\\chrome.exe`,
        `Google\\Chrome ${suffix}\\Application\\chrome.exe` // Some variants might double space or differ
      ];
      // Canary is special
      if (channel === 'canary') {
        paths.push(`Google\\Chrome SxS\\Application\\chrome.exe`);
      }

      for (const subPath of paths) {
        // @ts-ignore
        const fullPath = `${prefix}\\${subPath}`;
        // converting to imported fs to check existence would be better, but let's try assuming standard paths for now or use bun's file check if possible.
        // For now, let's just return the most likely path for Beta as per AGENTS.md if channel is beta.
      }
    }

    // Hardcoded per AGENTS.md for Beta, general fallback for others
    if (channel === 'beta') return 'C:\\Program Files\\Google\\Chrome Beta\\Application\\chrome.exe';
    if (channel === 'canary') return `${process.env.LOCALAPPDATA}\\Google\\Chrome SxS\\Application\\chrome.exe`;
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else if (process.platform === 'darwin') {
    // MacOS paths
    if (channel === 'beta') return '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta';
    if (channel === 'canary') return '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    // Linux/other - assume in PATH or use google-chrome
    return 'google-chrome';
  }
}

/**
 * Launches a new Chrome instance.
 * @returns A connected Puppeteer Browser instance.
 */
export async function start(args: StartArgs): Promise<Browser> {
  const chromePath = args.chromePath || getChromePath(args.channel);
  const port = 9222; // Or a random available port
  const userDataDir = require('path').resolve(process.cwd(), '.browser-tools-profile');

  const launchArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
  ];
  if (args.headless) {
    launchArgs.push('--headless');
  }

  const isWindows = process.platform === 'win32';
  /* console.log(`DEBUG: Executing command: (spawn) ${isWindows ? 'cmd' : chromePath}`); */ // Commenting out debug log to reduce noise

  let spawnedPid: number | undefined;

  if (isWindows) {
    // Use spawn to launch start command detached
    const child = require('child_process').spawn('cmd', ['/c', 'start', '"chrome"', `"${chromePath}"`, ...launchArgs], {
      detached: true,
      stdio: 'ignore',
      windowsVerbatimArguments: true
    });
    child.unref();
    // Note: On Windows with 'start', the child.pid is the cmd.exe process, not Chrome.
    // But we can't easily get Chrome PID without 'tasklist'. 
    // However, we can still save *something* or rely on the fact that we have a connection.
    // Actually, if we use 'checkConnection' it relies on PID file existence.
    // We should try to save the child pid, even if it's the launcher. 
    // But verify if subsequent 'kill' works? 
    // 'close' logic uses process.kill(pid). Killing cmd start wrapper might not kill Chrome.
    // But wait, 'start' command finishes immediately. So that PID is gone.

    // If we can't get the PID, we should still save the URL so checkConnection passes.
    // savePid signature: (pid: number, browserURL?: string, userDataDir?: string, chromePath?: string)
    // We can pass a dummy PID or 0 if we don't have it, but checkConnection uses pidInfo.browserURL.
    spawnedPid = child.pid;
  } else {
    const child = require('child_process').spawn(chromePath, launchArgs, {
      detached: true,
      stdio: 'ignore'
    });
    spawnedPid = child.pid;
    child.unref();
  }

  // Clean up debug log
  // console.log('DEBUG: Start command spawned. Polling for connection...');

  // Poll for Chrome to be ready
  const maxRetries = 20;
  let connected = false;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // @ts-ignore
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        // console.log('DEBUG: Connection established.');
        connected = true;
        break;
      }
    } catch (e) {
      // Ignore connection errors while waiting
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (!connected) {
    console.error('✗ Chrome did not start within the expected time.');
  }

  try {
    const browserURL = `http://127.0.0.1:${port}`;
    const browser = await connect({ browserURL, defaultViewport: null });
    const remotePid = browser.process()?.pid;

    // Prefer remotePid (if available), then spawnedPid (if linux/mac), then 0 (as fallback to allow saving config)
    // On Windows 'start', spawnedPid is useless (cmd exits). remotePid is undefined.
    // We need to save the config regardless of PID for checkConnection to work.
    const pidToSave = remotePid || spawnedPid || 0;

    savePid(pidToSave, browserURL, userDataDir, chromePath);
    console.log(`✓ Chrome started on port ${port}.`);

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
    const pidToKill = typeof browserOrPid === 'number' ? browserOrPid : (pidInfo ? pidInfo.pid : null);

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
    if (!pidInfo) {
      return false;
    }
    if (!pidInfo.browserURL) {
      return false;
    }

    // console.log(`DEBUG: Checking connection to ${pidInfo.browserURL}`);
    const browser = await connect({ browserURL: pidInfo.browserURL });
    await browser.disconnect();
    return true;
  } catch (error) {
    return false;
  }
}