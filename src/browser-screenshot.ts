import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleError } from './utils/error-handler.js';
import { connectToBrowser, getActivePage } from './utils/browser-utils.js';

export async function screenshot(): Promise<void> {
	try {
	const b = await connectToBrowser();
	const p = await getActivePage(b);

	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const filename = `screenshot-${timestamp}.png`;
	const filepath = join(tmpdir(), filename);

	await p.screenshot({ path: filepath });

	console.log(filepath);

	await b.disconnect();
	} catch (error) {
		handleError(error, 'Taking screenshot');
	}
}
