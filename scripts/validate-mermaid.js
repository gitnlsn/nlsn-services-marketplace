import { readFile } from "node:fs/promises";
import { glob } from "glob";
import { JSDOM } from "jsdom";

async function validateMermaid() {
	const htmlFiles = await glob("docs/**/*.html");
	let hasErrors = false;

	// Setup JSDOM for a simulated browser environment
	const dom = new JSDOM(
		`<!DOCTYPE html><html><body><div id="mermaid-container"></div></body></html>`,
	);
	global.window = dom.window;
	global.document = dom.window.document;
	// Import mermaid after setting up JSDOM globals
	const mermaid = (await import("mermaid")).default;

	for (const file of htmlFiles) {
		const content = await readFile(file, "utf-8");
		// Match both <pre class="mermaid"> and <div class="mermaid"> blocks
		const mermaidBlocks = [
			...content.matchAll(/<pre class="mermaid">([\s\S]*?)<\/pre>/g),
			...content.matchAll(/<div class="mermaid">([\s\S]*?)<\/div>/g)
		];

		for (const match of mermaidBlocks) {
			const mermaidCode = match[1].trim();
			if (mermaidCode) {
				try {
					// Initialize mermaid within the JSDOM environment
					mermaid.initialize({
						startOnLoad: false,
						securityLevel: "loose",
						// Suppress console warnings from mermaid about missing DOM elements
						logLevel: "fatal",
					});
					// Attempt to parse the mermaid code
					await mermaid.parse(mermaidCode);
					console.log(`✅ Valid Mermaid in ${file}`);
				} catch (e) {
					console.error(
						`❌ Invalid Mermaid in ${file}:\n${mermaidCode}\nError: ${e.message}`,
					);
					hasErrors = true;
				}
			}
		}
	}

	if (hasErrors) {
		process.exit(1);
	} else {
		console.log("All Mermaid diagrams are valid.");
	}
}

validateMermaid();
