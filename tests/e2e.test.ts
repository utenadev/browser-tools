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
    await execCommand('bun', ['dist/index.js', 'nav', 'https://example.com']);

    // Evaluate JavaScript
    const result = await execCommand('bun', ['dist/index.js', 'eval', 'document.title']);
    expect(result.stdout.trim()).toBe('Example Domain');

    // Clean up: kill Chrome
    await execCommand('taskkill', ['/f', '/im', 'chrome.exe']);
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
    const result = await execCommand('bun', ['dist/index.js', 'content', 'https://example.com']);
    expect(result.stdout).toContain('Example Domain');

    // Clean up
    await execCommand('taskkill', ['/f', '/im', 'chrome.exe']);
  });
});