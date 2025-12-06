import { handleError } from './utils/error-handler.js';
import { connectToBrowser, getActivePage } from './utils/browser-utils.js';

export async function nav(url: string, newTab: boolean = false): Promise<void> {
	try {
	const b = await connectToBrowser();

	if (newTab) {
		const p = await b.newPage();
		await p.goto(url, { waitUntil: "domcontentloaded" });
		console.log("✓ Opened:", url);
	} else {
		const p = await getActivePage(b);
		await p.goto(url, { waitUntil: "domcontentloaded" });
		console.log("✓ Navigated to:", url);
	}

	await b.disconnect();
	} catch (error) {
		handleError(error, 'Navigating');
	}
}
