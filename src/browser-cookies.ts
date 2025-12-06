import { handleError } from './utils/error-handler.js';
import { connectToBrowser, getActivePage } from './utils/browser-utils.js';

export async function cookies(): Promise<void> {
	try {
	const b = await connectToBrowser();
	const p = await getActivePage(b);

	const cookies = await p.cookies();

	for (const cookie of cookies) {
		console.log(`${cookie.name}: ${cookie.value}`);
		console.log(`  domain: ${cookie.domain}`);
		console.log(`  path: ${cookie.path}`);
		console.log(`  httpOnly: ${cookie.httpOnly}`);
		console.log(`  secure: ${cookie.secure}`);
		console.log("");
	}

	await b.disconnect();
	} catch (error) {
		handleError(error, 'Getting cookies');
	}
}
