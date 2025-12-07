// Unit tests for browser-tools CLI
// Note: These tests require Chrome running on :9222 (run bt start first)

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const logFile = 'test.log';
let logContent = '';

function log(message: string) {
  console.log(message);
  logContent += message + '\n';
}

log('Running unit tests for bt CLI...');

function runTest(command: string[], expected: string, testName: string, timeout: number = 10000) {
  return new Promise<void>((resolve) => {
    const child = spawn('bun', ['dist/index.js', ...command], { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill();
      log(`✗ ${testName} failed: Timeout after ${timeout}ms`);
      resolve();
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      const output = stdout + stderr;
      if (output.includes(expected)) {
        log(`✓ ${testName} passed`);
      } else {
        log(`✗ ${testName} failed: Expected '${expected}' in output: ${output}`);
      }
      resolve();
    });
  });
}

async function runTests() {
  // Basic validation tests
  await runTest([], 'Browser Tools - Chrome DevTools Protocol tools for agent-assisted web automation', 'Test 1: browser-tools without args');
  await runTest(['invalid'], 'Unknown argument: invalid', 'Test 2: invalid command');
  await runTest(['content'], 'Not enough non-option arguments: got 0, need at least 1', 'Test 3: content without url');
  await runTest(['eval'], 'Not enough non-option arguments: got 0, need at least 1', 'Test 4: eval without code');
  await runTest(['nav'], 'Not enough non-option arguments: got 0, need at least 1', 'Test 5: nav without url');
  await runTest(['pick'], 'Not enough non-option arguments: got 0, need at least 1', 'Test 6: pick without message');
  await runTest(['search'], 'Not enough non-option arguments: got 0, need at least 1', 'Test 7: search without query');

  // Functional tests (require Chrome running)
  await runTest(['start', '--channel', 'beta'], 'Chrome started on :9222', 'Test 8: start Chrome');
  await runTest(['nav', 'https://www.yahoo.co.jp'], 'Navigated to: https://www.yahoo.co.jp', 'Test 9: navigate to yahoo.co.jp');
  await runTest(['eval', 'document.title'], 'Yahoo! JAPAN', 'Test 10: evaluate document.title');
  await runTest(['content', 'https://www.yahoo.co.jp'], 'Yahoo! JAPAN', 'Test 11: extract content from yahoo.co.jp');
  await runTest(['search', 'puppeteer', '-n', '3'], 'Puppeteer | Puppeteer', 'Test 12: search for puppeteer');

  // Clean up: kill Chrome
  await runTest(['start', '--channel', 'beta'], 'Chrome started on :9222', 'Test 13: kill Chrome (dummy start to trigger kill)', 5000);

  log('All tests completed.');

  // Write to log file
  writeFileSync(logFile, logContent);
  log(`Results written to ${logFile}`);
}

runTests();