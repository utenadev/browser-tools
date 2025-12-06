import puppeteer from "puppeteer-core";
import { htmlToMarkdown, extractContent } from "./utils/content-extractor.js";

export async function search(query: string, numResults: number = 5, fetchContent: boolean = false): Promise<void> {
	// Global timeout - exit if script takes too long
	setTimeout(() => {
		console.error("✗ Timeout after 60s");
		process.exit(1);
	}, 60000).unref();

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

	// Extract results from current page
	async function extractResults() {
		return p.evaluate(() => {
			const items = [];
			const searchResults = document.querySelectorAll("div[data-ved], div.MjjYud");

			for (const result of searchResults) {
				const titleEl = result.querySelector("h3");
				const linkEl = result.querySelector("a");
				const snippetEl = result.querySelector("div.VwiC3b, div[data-sncf]");

				if (titleEl && linkEl && linkEl.href && !linkEl.href.startsWith("https://www.google.com")) {
					items.push({
						title: titleEl.textContent?.trim() || "",
						link: linkEl.href,
						snippet: snippetEl?.textContent?.trim() || "",
					});
				}
			}
			return items;
		});
	}

	// Navigate and paginate to collect results
	const results = [];
	let start = 0;

	while (results.length < numResults) {
		const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${start}`;
		await p.goto(searchUrl, { waitUntil: "domcontentloaded" });
		await p.waitForSelector("div.MjjYud", { timeout: 5000 }).catch(() => {});

		const pageResults = await extractResults();
		if (pageResults.length === 0) break; // No more results

		for (const r of pageResults) {
			if (results.length >= numResults) break;
			// Avoid duplicates
			if (!results.some((existing) => existing.link === r.link)) {
				results.push(r);
			}
		}

		start += 10; // Google uses 10 results per page
		if (start >= 100) break; // Google limits to ~100 results
	}

	if (results.length === 0) {
		console.log("No results found");
		process.exit(0);
	}

	// Helper to get HTML via CDP (works even with TrustedScriptURL restrictions)
	async function getHtmlViaCDP(page: any) {
		const client = await page.createCDPSession();
		try {
			const { root } = await client.send("DOM.getDocument", { depth: -1, pierce: true });
			const { outerHTML } = await client.send("DOM.getOuterHTML", { nodeId: root.nodeId });
			return outerHTML;
		} finally {
			await client.detach();
		}
	}



	// Optionally fetch readable content for each result
	if (fetchContent) {
		for (const result of results) {
			try {
				await Promise.race([
					p.goto(result.link, { waitUntil: "networkidle2" }),
					new Promise((r) => setTimeout(r, 10000)),
				]).catch(() => {});

				const html = await getHtmlViaCDP(p);
				const url = p.url();

				const { content: extractedContent } = extractContent(html, url);
				result.content = extractedContent.substring(0, 5000);
			} catch (e) {
				result.content = `(Error fetching: ${e.message})`;
			}
		}
	}

	// Output results
	for (let i = 0; i < results.length; i++) {
		const r = results[i];
		console.log(`--- Result ${i + 1} ---`);
		console.log(`Title: ${r.title}`);
		console.log(`Link: ${r.link}`);
		console.log(`Snippet: ${r.snippet}`);
		if (r.content) {
			console.log(`Content:\n${r.content}`);
		}
		console.log("");
	}

	process.exit(0);
}
