import { handleError } from './utils/error-handler.js';
import { connectToBrowser, getActivePage } from './utils/browser-utils.js';

export async function evalCode(code: string): Promise<void> {
	try {
	const b = await connectToBrowser();
	const p = await getActivePage(b);

	const result = await p.evaluate((c: string) => {
		const AsyncFunction = (async () => {}).constructor;
		return new AsyncFunction(`return (${c})`)();
	}, code);

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

	await b.disconnect();
	} catch (error) {
		handleError(error, 'Evaluating code');
	}
}
