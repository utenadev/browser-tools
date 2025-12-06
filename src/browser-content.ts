import { htmlToMarkdown, extractContent } from "./utils/content-extractor.js";
import { handleError } from './utils/error-handler.js';
import { connectToBrowser, getActivePage } from './utils/browser-utils.js';

export async function content(url: string): Promise<void> {
	try {
	// Global timeout - exit if script takes too long
	const TIMEOUT = 30000;
	const timeoutId = setTimeout(() => {
		console.error("✗ Timeout after 30s");
		process.exit(1);
	}, TIMEOUT).unref();

	const b = await connectToBrowser();
	const p = await getActivePage(b);

	await Promise.race([
		p.goto(url, { waitUntil: "networkidle2" }),
		new Promise((r) => setTimeout(r, 10000)),
	]).catch(() => {});

	// Get HTML via page evaluation
	const outerHTML = await p.evaluate(() => document.documentElement.outerHTML);

	const finalUrl = p.url();

	const { title, content } = extractContent(outerHTML, finalUrl);

	console.log(`URL: ${finalUrl}`);
	if (title) console.log(`Title: ${title}`);
	console.log("");
	console.log(content);

	process.exit(0);
	} catch (error) {
		handleError(error, 'Extracting content');
	}
}
