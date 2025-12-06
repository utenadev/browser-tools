export class BrowserToolsError extends Error {
  constructor(message: string, public hint?: string) {
    super(message);
    this.name = 'BrowserToolsError';
  }
}

export function handleError(error: unknown, context: string): never {
  let message: string;
  let hint: string | undefined;

  if (error instanceof BrowserToolsError) {
    message = error.message;
    hint = error.hint;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = 'Unknown error';
  }

  console.error(`✗ ${context}: ${message}`);
  if (hint) {
    console.error(`  ${hint}`);
  }
  process.exit(1);
}

export function logWarning(message: string) {
  console.warn(`⚠️ ${message}`);
}

export function logSuccess(message: string) {
  console.log(`✓ ${message}`);
}