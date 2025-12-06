export class BrowserToolsError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'BrowserToolsError';
  }
}

export function handleError(error: unknown, context: string): never {
  if (error instanceof BrowserToolsError) {
    console.error(`✗ ${context}: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`✗ ${context}: ${error.message}`);
  } else {
    console.error(`✗ ${context}: Unknown error`);
  }
  process.exit(1);
}

export function logWarning(message: string) {
  console.warn(`⚠️ ${message}`);
}

export function logSuccess(message: string) {
  console.log(`✓ ${message}`);
}