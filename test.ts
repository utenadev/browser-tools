// Simple integration tests for browser-tools CLI
// Note: These tests automatically start Chrome on :9222 if not running

import { spawn, execSync } from 'child_process';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { setTimeout } from 'timers/promises';

// Set test environment to skip middleware
process.env.NODE_ENV = 'test';

const logFile = 'test.log';
let logContent = '';

function log(message: string) {
  console.log(message);
  logContent += message + '\n';
}

function runCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (e: any) {
    return '';
  }
}

async function isChromeRunning(): Promise<boolean> {
  try {
    // @ts-ignore
    const response = await fetch('http://127.0.0.1:9222/json/version');
    if (!response.ok) return false;

    // Also check if PID file exists, otherwise CLI commands will fail
    const pidPath = join(process.cwd(), '.browser-tools-pid.json');
    return existsSync(pidPath);
  } catch (e) {
    return false;
  }
}

async function startChrome() {
  log('Starting Chrome in headless mode for testing...');
  const subprocess = spawn('bun', ['dist/index.js', 'start', '--headless', '--channel', 'beta'], {
    detached: true,
    stdio: 'ignore'
  });
  subprocess.unref();

  // Wait for Chrome to be ready and PID file to ensure CLI knows it's ready
  const pidPath = join(process.cwd(), '.browser-tools-pid.json');
  for (let i = 0; i < 40; i++) {
    if (existsSync(pidPath)) {
      // Optional: also check if Chrome is responding on port?
      if (await isChromeRunning()) {
        log('Chrome started successfully.');
        return true;
      }
    }
    await setTimeout(500);
  }
  log('Failed to start Chrome.');
  return false;
}

async function stopChrome() {
  log('Stopping Chrome...');
  spawn('bun', ['dist/index.js', 'close'], { stdio: 'inherit' });
  await setTimeout(2000);
}

log('Running integration tests for browser-tools CLI...');

function runCliTest(
  testName: string,
  command: string[],
  expectedOutput: string,
  timeout: number = 20000
): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn('bun', ['dist/index.js', ...command]);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => (stdout += data.toString()));
    child.stderr.on('data', (data) => (stderr += data.toString()));

    const timer = global.setTimeout(() => {
      child.kill();
      log(`✗ ${testName} FAILED: Timeout after ${timeout}ms`);
      resolve();
    }, timeout);

    child.on('close', () => {
      clearTimeout(timer);
      const output = stdout + stderr;
      if (output.includes(expectedOutput)) {
        log(`✓ ${testName} PASSED`);
      } else {
        log(`✗ ${testName} FAILED: Expected to find "${expectedOutput}"`);
        log(`   COMMAND: bun dist/index.js ${command.join(' ')}`);
        log(`   OUTPUT: ${output}`);
      }
      resolve();
    });
  });
}

async function runAllTests() {
  let chromeStartedByTest = false;
  if (!(await isChromeRunning())) {
    if (await startChrome()) {
      chromeStartedByTest = true;
    } else {
      log('Aborting tests because Chrome could not be started.');
      return;
    }
  }

  try {
    log('\n--- Starting tests ---');

    // --- Prerequisite tests ---
    await runCliTest('Test 1: Invalid command fails', ['invalid-command'], 'Unknown argument: invalid-command');
    await runCliTest('Test 2: `content` requires url', ['content'], 'Not enough non-option arguments');
    await runCliTest('Test 3: `eval` requires code', ['eval'], 'Not enough non-option arguments');
    await runCliTest('Test 4: `navigate` requires url', ['navigate'], 'Not enough non-option arguments');

    // --- Functional tests (persistent session) ---
    await runCliTest('Test 5: `navigate` command works', ['navigate', 'https://www.yahoo.co.jp'], '✓ Navigated to: https://www.yahoo.co.jp');
    await runCliTest('Test 6: `eval` command works', ['eval', 'document.title'], 'Yahoo! JAPAN');
    await runCliTest('Test 7: `content` command with URL works', ['content', 'https://www.yahoo.co.jp'], 'Title: Yahoo! JAPAN', 25000);

    // --- "run" command tests (atomic session) ---
    // Note: "run" command starts its own browser instance, so it doesn't rely on the shared one,
    // but we test it here for completeness.
    await runCliTest(
      'Test 8: `run` command executes content extraction',
      ['run', 'content https://www.yahoo.co.jp'],
      'Title: Yahoo! JAPAN',
      40000
    );

    const screenshotPath = join(process.cwd(), 'legacy-test-screenshot.png');
    if (existsSync(screenshotPath)) unlinkSync(screenshotPath);
    await runCliTest(
      'Test 9: `run` command executes screenshot',
      ['run', `screenshot ${screenshotPath} --url https://www.yahoo.co.jp`],
      `✓ Screenshot saved to: ${screenshotPath}`,
      40000
    );
    if (!existsSync(screenshotPath)) {
      log(`✗ Test 9 FAILED: Screenshot file was not created at ${screenshotPath}`);
    } else {
      unlinkSync(screenshotPath); // Clean up
    }

  } finally {
    if (chromeStartedByTest) {
      await stopChrome();
    }
    log('\n--- All tests completed ---');
    writeFileSync(logFile, logContent);
    log(`\nTest results logged to ${logFile}`);
  }
}

runAllTests();
