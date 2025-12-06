// Test script based on README examples
// Note: These tests require Chrome running on :9222 (run bt start first)

console.log('Testing bt CLI...');

// Since Bun can run the built JS directly, use bun run dist/index.js

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

// Test script based on README examples
// Note: These tests require Chrome running on :9222 (run bt start first)

const logFile = 'test.log';
let logContent = '';

function log(message: string) {
  console.log(message);
  logContent += message + '\n';
}

log('Testing bt CLI...');

function runTest(command: string[], expected: string, testName: string) {
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

    child.on('close', (code) => {
      const output = stdout + stderr;
      if (output.includes(expected)) {
        log(`✓ ${testName} passed`);
      } else {
        log(`✗ ${testName} failed: Unexpected output: ${output}`);
      }
      resolve();
    });
  });
}

async function runTests() {
  await runTest([], 'Usage: bt <command> [options]', 'Test 1: bt without args');
  await runTest(['invalid'], 'Usage: bt <command> [options]', 'Test 2: invalid command');
  await runTest(['content'], 'Usage: bt content <url>', 'Test 3: content without url');
  await runTest(['eval'], 'Usage: bt eval <code>', 'Test 4: eval without code');
  await runTest(['nav'], 'Usage: bt nav <url> [--new]', 'Test 5: nav without url');
  await runTest(['pick'], 'Usage: bt pick <message>', 'Test 6: pick without message');
  await runTest(['search'], 'Usage: bt search <query> [-n <num>] [--content]', 'Test 7: search without query');

  log('Tests completed.');

  // Write to log file
  writeFileSync(logFile, logContent);
  log(`Results written to ${logFile}`);
}

runTests();