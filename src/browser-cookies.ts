import { Yargs } from 'yargs';
import { handleError } from './utils/error-handler.js';
import { connectToBrowser, getActivePage } from './utils/browser-utils.js';
import { Browser } from 'puppeteer-core';

export const command = 'cookies';
export const description = 'Display cookies for current tab';

interface CookiesArgs {
	browserInstance?: Browser;
}

export const builder = (yargs: Yargs) => yargs;

export const handler = async (argv: CookiesArgs): Promise<void> => {
	const shouldDisconnect = !argv.browserInstance;
	let browser: Browser | undefined = argv.browserInstance;

	try {
		if (!browser) {
			browser = await connectToBrowser();
		}
		const p = await getActivePage(browser);

		const cookies = await p.cookies();

		for (const cookie of cookies) {
			console.log(`${cookie.name}: ${cookie.value}`);
			console.log(`  domain: ${cookie.domain}`);
			console.log(`  path: ${cookie.path}`);
			console.log(`  httpOnly: ${cookie.httpOnly}`);
			console.log(`  secure: ${cookie.secure}`);
			console.log("");
		}

	} catch (error) {
		handleError(error, 'Getting cookies');
	} finally {
		if (shouldDisconnect && browser) {
			await browser.disconnect();
		}
	}
};

export const cookies = async () => handler({});
