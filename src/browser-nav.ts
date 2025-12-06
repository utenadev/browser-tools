import puppeteer from "puppeteer-core";

export async function nav(url: string, newTab: boolean = false): Promise<void> {
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

	if (newTab) {
		const p = await b.newPage();
		await p.goto(url, { waitUntil: "domcontentloaded" });
		console.log("✓ Opened:", url);
	} else {
		const p = (await b.pages()).at(-1);
		await p.goto(url, { waitUntil: "domcontentloaded" });
		console.log("✓ Navigated to:", url);
	}

	await b.disconnect();
}
