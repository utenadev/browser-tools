import { Yargs } from 'yargs';
import { handleError } from './utils/error-handler.js';
import { connectToBrowser, getActivePage } from './utils/browser-utils.js';
import { Browser } from 'puppeteer-core';

export const command = 'eval <code>';
export const description = 'Execute JavaScript in the active tab';

interface EvalArgs {
	code: string;
	browserInstance?: Browser;
}

export const builder = (yargs: Yargs) => {
	return yargs
		.positional('code', {
			type: 'string',
			description: 'JavaScript code to execute',
		});
};

export const handler = async (argv: EvalArgs): Promise<void> => {
	const shouldDisconnect = !argv.browserInstance;
	let browser: Browser | undefined = argv.browserInstance;

	try {
		if (!browser) {
			browser = await connectToBrowser();
		}

		const p = await getActivePage(browser);

		const result = await p.evaluate((c: string) => {
			const AsyncFunction = (async () => { }).constructor;
			return new AsyncFunction(`return (${c})`)();
		}, argv.code);

		if (Array.isArray(result)) {
			for (let i = 0; i < result.length; i++) {
				if (i > 0) console.log("");
				for (const [key, value] of Object.entries(result[i])) {
					console.log(`${key}: ${value}`);
				}
			}
		} else if (typeof result === "object" && result !== null) {
			for (const [key, value] of Object.entries(result)) {
				console.log(`${key}: ${value}`);
			}
		} else {
			console.log(result);
		}

	} catch (error) {
		handleError(error, 'Evaluating code');
	} finally {
		if (shouldDisconnect && browser) {
			await browser.disconnect();
		}
	}
};

// Deprecated standalone function for backward compatibility if needed, 
// though we usually replace usages.
export const evalCode = async (code: string) => handler({ code });
