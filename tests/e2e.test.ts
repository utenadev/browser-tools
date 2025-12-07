import { test, expect } from '@playwright/test';
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

test.describe('Browser Tools E2E Tests', () => {
  test('should start Chrome and navigate to a page', async ({ page }) => {
    // Start Chrome using browser-tools
    const startProcess = spawn('bun', ['dist/index.js', 'start', '--channel', 'beta'], {
      detached: true,
      stdio: 'ignore'
    });
    startProcess.unref();

    // Wait for Chrome to start
    await setTimeout(5000);

    // Navigate to a page
    await execCommand('bun', ['dist/index.js', 'navigate', 'https://www.yahoo.co.jp']);

    // Evaluate JavaScript
    const result = await execCommand('bun', ['dist/index.js', 'eval', 'document.title']);
    expect(result.stdout.trim()).toBe('Yahoo! JAPAN');

    // Clean up: close Chrome
    await execCommand('bun', ['dist/index.js', 'close']);
  });

  test('should extract content from a page', async ({ page }) => {
    // Start Chrome
    const startProcess = spawn('bun', ['dist/index.js', 'start', '--channel', 'beta'], {
      detached: true,
      stdio: 'ignore'
    });
    startProcess.unref();
    await setTimeout(5000);

    // Extract content
    const result = await execCommand('bun', ['dist/index.js', 'content', 'https://www.yahoo.co.jp']);
    expect(result.stdout).toContain('Yahoo! JAPAN');

    // Clean up
    await execCommand('bun', ['dist/index.js', 'close']);
  });

  test('should run a command atomically with run', async ({ page }) => {
    // Run navigate command atomically
    const result = await execCommand('bun', ['dist/index.js', 'run', 'navigate https://www.yahoo.co.jp']);
    expect(result.stdout).toContain('Navigated to: https://www.yahoo.co.jp');
  });
});