import puppeteer from "puppeteer-core";

export async function evalCode(code: string): Promise<void> {
	const b = await Promise.race([
		puppeteer.connect({
			browserURL: "http://localhost:9222",
			defaultViewport: null,
		}),
		new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
	]).catch((e) => {
		console.error("✗ Could not connect to browser:", e.message);
		console.error("  Run: bt start");
		process.exit(1);
	});

	const p = (await b.pages()).at(-1);

	if (!p) {
		console.error("✗ No active tab found");
		process.exit(1);
	}

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
}
