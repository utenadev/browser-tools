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
  timeout: number = 10000
): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn('bun', ['dist/index.js', ...command]);
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
        log(`   OUTPUT: ${output.substring(0, 300)}...`);
      }
      resolve();
    });
  });
}

async function runAllTests() {
  log('\n--- Starting tests ---');
  log('NOTE: Ensure Chrome is running via "bun run start" before executing these tests.');
  
  // --- Prerequisite tests ---
  await runCliTest('Test 1: Invalid command fails', ['invalid-command'], 'Unknown argument: invalid-command');
  await runCliTest('Test 2: `content` requires url', ['content'], 'Not enough non-option arguments');
  await runCliTest('Test 3: `eval` requires code', ['eval'], 'Not enough non-option arguments');
  await runCliTest('Test 4: `navigate` requires url', ['navigate'], 'Not enough non-option arguments');
  
  // --- Functional tests (persistent session) ---
  await runCliTest('Test 5: `navigate` command works', ['navigate', 'https://www.yahoo.co.jp'], '✓ Navigated to: https://www.yahoo.co.jp');
  await runCliTest('Test 6: `eval` command works', ['eval', 'document.title'], 'Yahoo! JAPAN');
  await runCliTest('Test 7: `content` command with URL works', ['content', 'https://www.yahoo.co.jp'], 'Yahoo! JAPAN', 15000);
  
  // --- "run" command tests (atomic session) ---
  await runCliTest(
    'Test 8: `run` command executes content extraction',
    ['run', '"content https://www.yahoo.co.jp"'],
    'Yahoo! JAPAN'
  );

  const screenshotPath = join(process.cwd(), 'legacy-test-screenshot.png');
  if (existsSync(screenshotPath)) unlinkSync(screenshotPath);
  await runCliTest(
    'Test 9: `run` command executes screenshot',
    ['run', `"screenshot ${screenshotPath} --url https://www.yahoo.co.jp"`],
    `✓ Screenshot saved to: ${screenshotPath}`
  );
  if (!existsSync(screenshotPath)) {
    log(`✗ Test 9 FAILED: Screenshot file was not created at ${screenshotPath}`);
  } else {
    unlinkSync(screenshotPath); // Clean up
  }

  log('\n--- All tests completed ---');

  writeFileSync(logFile, logContent);
  log(`\nTest results logged to ${logFile}`);
}

runAllTests();
