import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";
import { install, ChromeReleaseChannel } from "@puppeteer/browsers";
import { $ } from "bun";
import { handleError } from './utils/error-handler.js';

export async function checkConnection(): Promise<boolean> {
	try {
		const browser = await Promise.race([
			puppeteer.connect({
				browserURL: "http://localhost:9222",
				defaultViewport: null,
			}),
			new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000)),
		]);
		await browser.disconnect();
		return true;
	} catch {
		return false;
	}
}

export async function start(useProfile: boolean, chromePath?: string, channel: string = 'stable', headless: boolean = false): Promise<void> {
	try {
	// Kill existing Chrome
	if (process.platform === 'win32') {
		await $`taskkill /f /im chrome.exe`.nothrow();
	} else {
		await $`killall 'Google Chrome'`.nothrow();
	}

	// Wait a bit for processes to fully die
	await new Promise((r) => setTimeout(r, 1000));

	// Setup profile directory
	await $`mkdir -p ~/.cache/scraping`.nothrow();

	if (useProfile) {
		// Sync profile with rsync or robocopy (much faster on subsequent runs)
		const profilePath = process.platform === 'win32'
			? `${process.env.USERPROFILE}\\AppData\\Local\\Google\\Chrome\\User Data`
			: process.platform === 'darwin'
			? `${process.env.HOME}/Library/Application Support/Google/Chrome`
			: `${process.env.HOME}/.config/google-chrome`;
		const cachePath = `${process.env["HOME"] || process.env["USERPROFILE"]}/.cache/scraping`;
		if (process.platform === 'win32') {
			await $`robocopy "${profilePath}" "${cachePath}" /MIR`.nothrow();
		} else {
			await $`rsync -a --delete "${profilePath}/" "${cachePath}/"`.nothrow();
		}
	}

	// Get Chrome executable path
	let chromePathToUse: string;
	if (chromePath) {
		chromePathToUse = chromePath;
	} else {
		// Try local installation first
		const localPath = process.platform === 'win32'
			? channel === 'beta'
				? 'C:\\Program Files\\Google\\Chrome Beta\\Application\\chrome.exe'
				: channel === 'dev'
				? 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe'
				: channel === 'canary'
				? 'C:\\Program Files\\Google\\Chrome SxS\\Application\\chrome.exe'
				: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
			: channel === 'beta'
			? '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta'
			: channel === 'dev'
			? '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev'
			: channel === 'canary'
			? '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
			: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

		// Check if local path exists
		const fs = await import('fs');
		if (fs.existsSync(localPath)) {
			chromePathToUse = localPath;
		} else {
			// Download from puppeteer/browsers
			const channelEnum = channel === 'beta' ? ChromeReleaseChannel.BETA : channel === 'dev' ? ChromeReleaseChannel.DEV : channel === 'canary' ? ChromeReleaseChannel.CANARY : ChromeReleaseChannel.STABLE;
			try {
				chromePathToUse = await install({ browser: 'chrome', channel: channelEnum });
			} catch (error) {
				throw new Error(`Chrome ${channel} channel is not available.`);
			}
		}
	}

	// Start Chrome in background (detached so Node can exit)
	const userDataDir = `${process.env["HOME"] || process.env["USERPROFILE"]}/.cache/scraping`;
	const args = ["--remote-debugging-port=9222", `--user-data-dir=${userDataDir}`];
	if (headless) args.push('--headless');
	spawn(
		chromePathToUse,
		args,
		{ detached: true, stdio: "ignore" },
	).unref();

	// Wait for Chrome to be ready by attempting to connect
	let connected = false;
	for (let i = 0; i < 30; i++) {
		try {
			const browser = await puppeteer.connect({
				browserURL: "http://localhost:9222",
				defaultViewport: null,
			});
			await browser.disconnect();
			connected = true;
			break;
		} catch {
			await new Promise((r) => setTimeout(r, 500));
		}
	}

	if (!connected) {
		console.error("✗ Failed to connect to Chrome");
		process.exit(1);
	}

	console.log(`✓ Chrome started on :9222${useProfile ? " with your profile" : ""}`);
	} catch (error) {
		handleError(error, 'Starting Chrome');
	}
}
