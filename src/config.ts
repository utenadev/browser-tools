import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface Config {
  chromePath?: string;
  channel?: string;
  headless?: boolean;
  profile?: boolean;
}

const configPath = join(process.cwd(), '.browser-tools.json');
const pidPath = join(process.cwd(), '.browser-tools-pid.json');

export function loadConfig(): Config {
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      return config;
    } catch {
      return {};
    }
  }
  return {};
}

export function saveConfig(config: Config): void {
  const fs = require('fs');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function savePid(pid: number): void {
  const fs = require('fs');
  fs.writeFileSync(pidPath, JSON.stringify({ pid }, null, 2));
}

export function loadPid(): number | null {
  if (existsSync(pidPath)) {
    try {
      const data = JSON.parse(readFileSync(pidPath, 'utf-8'));
      return data.pid || null;
    } catch {
      return null;
    }
  }
  return null;
}

export function clearPid(): void {
  const fs = require('fs');
  if (existsSync(pidPath)) {
    fs.unlinkSync(pidPath);
  }
}