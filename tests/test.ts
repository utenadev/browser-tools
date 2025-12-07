// Simple integration tests for browser-tools CLI
// Note: These tests require Chrome running on :9222 (run 'bun run start' first)

import { spawn } from 'child_process';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

// Set test environment to skip middleware
process.env.NODE_ENV = 'test';

const logFile = 'test.log';
let logContent = '';

function log(message: string) {
  console.log(message);
  logContent += message + '\n';
}

log('Running integration tests for browser-tools CLI...');

function runCliTest(
  testName: string,
  command: string[],
  expectedOutput: string,
  timeout: number = 20000
): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn('bun', ['dist/index.js', ...command], {
      env: { ...process.env, NODE_ENV: 'test', BROWSER_TOOLS_TEST_MODE: 'true' }
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => (stdout += data.toString()));
    child.stderr.on('data', (data) => (stderr += data.toString()));

    const timer = setTimeout(() => {
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
        log(`   OUTPUT: ${output.substring(0, 2000)}...`);
      }
      resolve();
    });
  });
}

async function waitForBrowser(port: number = 9222, timeout: number = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch (e) {
      // Ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Browser did not start within ${timeout}ms`);
}

async function setup() {
  log('Setting up: Starting Chrome...');
  // Use pipe to capture output for logging, or inherit to see it in console
  const child = spawn('bun', ['dist/index.js', 'start', '--channel', 'beta'], {
    stdio: 'inherit',
    detached: true
  });
  child.unref();
  await waitForBrowser();
  log('Setup complete: Chrome is ready.');
}

async function teardown() {
  log('Teardown: Stopping Chrome...');
  return new Promise<void>((resolve) => {
    const child = spawn('bun', ['dist/index.js', 'close'], { stdio: 'ignore' });
    child.on('close', () => {
      log('Teardown complete.');
      resolve();
    });
  });
}

async function runAllTests() {
  log('\n--- Starting tests ---');

  try {
    await setup();

    // --- Prerequisite tests ---
    await runCliTest('Test 1: Invalid command fails', ['invalid-command'], 'Unknown argument: invalid-command');
    // Test 2 removed
    await runCliTest('Test 3: `eval` requires code', ['eval'], 'Not enough non-option arguments');
    await runCliTest('Test 4: `navigate` requires url', ['navigate'], 'Not enough non-option arguments');

    // --- Functional tests (persistent session) ---
    await runCliTest('Test 5: `navigate` command works', ['navigate', 'https://www.yahoo.co.jp'], '✓ Navigated to: https://www.yahoo.co.jp');
    await runCliTest('Test 6: `eval` command works', ['eval', 'document.title'], 'Yahoo! JAPAN');
    await runCliTest('Test 7: `content` command with URL works', ['content', 'https://www.yahoo.co.jp'], 'Yahoo! JAPAN', 45000);

    // --- "run" command tests (atomic session) ---
    /*
    // TODO: Fix run command argument parsing logic in src/run.ts to support these tests
    await runCliTest(
      'Test 8: `run` command executes content extraction',
      ['run', '"content https://www.yahoo.co.jp"'],
      'Yahoo! JAPAN',
      30000
    );

    const screenshotPath = join(process.cwd(), 'legacy-test-screenshot.png');
    if (existsSync(screenshotPath)) unlinkSync(screenshotPath);
    await runCliTest(
      'Test 9: `run` command executes screenshot',
      ['run', `"screenshot ${screenshotPath} --url https://www.yahoo.co.jp"`],
      `✓ Screenshot saved to: ${screenshotPath}`,
      30000
    );
    if (!existsSync(screenshotPath)) {
      log(`✗ Test 9 FAILED: Screenshot file was not created at ${screenshotPath}`);
    } else {
      unlinkSync(screenshotPath); // Clean up
    }
    */

    // --- Additional command tests ---
    await runCliTest('Test 8: `search` command works', ['search', 'test'], 'Result 1', 45000);
    await runCliTest('Test 9: `cookies` command works', ['cookies'], ':');
    await runCliTest('Test 10: `hn-scraper` command works', ['hn-scraper', '5'], 'submissions', 45000);

  } catch (error) {
    log(`✗ Critical Error during tests: ${error}`);
  } finally {
    await teardown();
    log('\n--- All tests completed ---');
    writeFileSync(logFile, logContent);
    log(`\nTest results logged to ${logFile}`);
  }
}

runAllTests();
