import { describe, test, expect } from 'bun:test';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { setTimeout } from 'timers/promises';

const execCommand = (command: string, args: string[] = []): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed: ${stderr}`));
      }
    });
  });
};

async function waitForPidFile(retries = 40, delay = 500): Promise<boolean> {
  const pidPath = require('path').join(process.cwd(), '.browser-tools-pid.json');
  for (let i = 0; i < retries; i++) {
    if (require('fs').existsSync(pidPath)) {
      return true;
    }
    await setTimeout(delay);
  }
  return false;
}

describe('Browser Tools E2E Tests', () => {
  test('should start Chrome and navigate to a page', async () => {
    // Start Chrome using browser-tools
    const startProcess = spawn('bun', ['dist/index.js', 'start', '--channel', 'beta'], {
      detached: true,
      stdio: 'pipe'
    });

    startProcess.stdout?.on('data', (data) => console.log(`[Chrome STDOUT]: ${data}`));
    startProcess.stderr?.on('data', (data) => console.error(`[Chrome STDERR]: ${data}`));

    startProcess.unref();

    // Wait for PID file (implies Chrome started and config saved)
    const isReady = await waitForPidFile();
    if (!isReady) {
      throw new Error('Chrome failed to start (PID file not found)');
    }

    // Check if PID file exists (Double check)
    const pidPath = require('path').join(process.cwd(), '.browser-tools-pid.json');
    if (require('fs').existsSync(pidPath)) {
      console.log(`[Test] PID file exists: ${require('fs').readFileSync(pidPath, 'utf8')}`);
    } else {
      console.log(`[Test] PID file DOES NOT exist at ${pidPath}`);
    }

    try {
      // Navigate to a page
      await execCommand('bun', ['dist/index.js', 'navigate', 'https://www.yahoo.co.jp']);

      // Verify
      const { stdout } = await execCommand('bun', ['dist/index.js', 'eval', 'document.title']);
      expect(stdout).toContain('Yahoo! JAPAN');
    } finally {
      // Clean up
      try {
        await execCommand('bun', ['dist/index.js', 'close']);
      } catch (e) {
        // Ignore
      }
    }
  }, 60000);

  test('should extract content from a page', async () => {
    // Start Chrome
    const startProcess = spawn('bun', ['dist/index.js', 'start', '--channel', 'beta'], {
      detached: true,
      stdio: 'pipe'
    });

    startProcess.stdout?.on('data', (data) => console.log(`[Chrome STDOUT]: ${data}`));
    startProcess.stderr?.on('data', (data) => console.error(`[Chrome STDERR]: ${data}`));

    startProcess.unref();
    // Wait for Chrome to start
    const isReady = await waitForPidFile();
    if (!isReady) {
      throw new Error('Chrome failed to start (PID file not found)');
    }

    try {
      // Extract content
      const result = await execCommand('bun', ['dist/index.js', 'content', 'https://www.yahoo.co.jp']);
      expect(result.stdout).toContain('Yahoo! JAPAN');
    } finally {
      // Clean up
      await execCommand('bun', ['dist/index.js', 'close']);
    }
  }, 15000);

  test('should run a command atomically with run', async () => {
    // Run navigate command atomically
    const result = await execCommand('bun', ['dist/index.js', 'run', 'navigate https://www.yahoo.co.jp']);
    expect(result.stdout).toContain('Navigated to: https://www.yahoo.co.jp');
  });
});