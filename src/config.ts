import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface Config {
  chromePath?: string;
  channel?: string;
  headless?: boolean;
  profile?: boolean;
}

const configPath = join(process.cwd(), '.browser-tools.json');

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