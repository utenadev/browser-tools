import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";
import { install, ChromeReleaseChannel } from "@puppeteer/browsers";
import { $ } from "bun";
import { handleError } from './utils/error-handler.js';
import { connectToBrowser } from './utils/browser-utils.js';
import { savePid, loadPid, clearPid } from './config.js';

export async function checkConnection(): Promise<boolean> {
	try {
		const browser = await connectToBrowser();
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
		// Use local installation
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

		console.log(`Using Chrome at: ${localPath}`);
		chromePathToUse = localPath;
	}

	// Start Chrome in background (detached so Node can exit)
	const userDataDir = `${process.env["HOME"] || process.env["USERPROFILE"]}/.cache/scraping`;
	const args = ["--remote-debugging-port=9222", `--user-data-dir=${userDataDir}`];
	if (headless) args.push('--headless');
	const child = spawn(
		chromePathToUse,
		args,
		{ detached: true, stdio: "ignore" },
	);
	child.unref();
	savePid(child.pid!);

	// Wait for Chrome to be ready by attempting to connect
	let connected = false;
	for (let i = 0; i < 30; i++) {
		try {
			const browser = await connectToBrowser();
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

export async function close(): Promise<void> {
	try {
		const pid = loadPid();
		if (!pid) {
			console.warn('No Chrome instance started by this tool.');
			return;
		}

		if (process.platform === 'win32') {
			await $`taskkill /pid ${pid} /t`.nothrow();
		} else {
			await $`kill ${pid}`.nothrow();
		}

		clearPid();
		console.log('✓ Chrome instance closed.');
	} catch (error) {
		handleError(error, 'Closing Chrome');
	}
}
