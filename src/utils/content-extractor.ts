import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

export function htmlToMarkdown(html: string): string {
	const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
	turndown.use(gfm);
	turndown.addRule("removeEmptyLinks", {
		filter: (node) => node.nodeName === "A" && !node.textContent?.trim(),
		replacement: () => "",
	});
	return turndown
		.turndown(html)
		.replace(/\[\\?\[\s*\\?\]\]\([^)]*\)/g, "")
		.replace(/ +/g, " ")
		.replace(/\s+,/g, ",")
		.replace(/\s+\./g, ".")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function extractContent(html: string, url: string): { title?: string; content: string } {
	// Extract with Readability
	const doc = new JSDOM(html, { url });
	const reader = new Readability(doc.window.document);
	const article = reader.parse();

	if (article && article.content) {
		return {
			title: article.title,
			content: htmlToMarkdown(article.content),
		};
	} else {
		// Fallback
		const fallbackDoc = new JSDOM(html, { url });
		const fallbackBody = fallbackDoc.window.document;
		fallbackBody.querySelectorAll("script, style, noscript, nav, header, footer, aside").forEach((el) => el.remove());
		const main = fallbackBody.querySelector("main, article, [role='main'], .content, #content") || fallbackBody.body;
		const fallbackHtml = main?.innerHTML || "";
		if (fallbackHtml.trim().length > 100) {
			return {
				content: htmlToMarkdown(fallbackHtml),
			};
		} else {
			return {
				content: "(Could not extract content)",
			};
		}
	}
}