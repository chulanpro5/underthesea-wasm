#!/usr/bin/env node
// Fetch the binary model + wasm assets (kept out of git) from the GitHub Release
// listed in model-assets.json, verifying each by sha256. Idempotent: a file that
// already exists with the right hash is left alone. Runs in `prepare`, so it
// populates a dev checkout on `npm install` and the tarball before `npm publish`.
//
// Dependency-free (Node 18+ built-ins only). Override the host with
// UNDERTHESEA_WASM_ASSETS_BASEURL (e.g. an internal mirror).

import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function sha256(path) {
	try {
		const buf = await readFile(path);
		return createHash("sha256").update(buf).digest("hex");
	} catch {
		return null;
	}
}

async function main() {
	const manifest = JSON.parse(await readFile(join(ROOT, "model-assets.json"), "utf8"));
	const baseUrl = (process.env.UNDERTHESEA_WASM_ASSETS_BASEURL || manifest.baseUrl).replace(/\/+$/, "");

	for (const file of manifest.files) {
		const dest = join(ROOT, file.path);
		if ((await sha256(dest)) === file.sha256) {
			console.log(`✓ ${file.path} (cached)`);
			continue;
		}
		const url = `${baseUrl}/${basename(file.path)}`;
		console.log(`↓ ${file.path}  ←  ${url}`);
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(
				`Failed to download ${url} (HTTP ${res.status}).\n` +
					`Set UNDERTHESEA_WASM_ASSETS_BASEURL to a reachable host, or place the file at ${dest} manually.`,
			);
		}
		const bytes = Buffer.from(await res.arrayBuffer());
		const got = createHash("sha256").update(bytes).digest("hex");
		if (got !== file.sha256) {
			throw new Error(`Checksum mismatch for ${file.path}\n  expected ${file.sha256}\n  got      ${got}`);
		}
		await mkdir(dirname(dest), { recursive: true });
		await writeFile(dest, bytes);
		console.log(`✓ ${file.path} (${bytes.length} bytes, verified)`);
	}
	console.log("model assets ready.");
}

main().catch((err) => {
	console.error(`\n[fetch-model] ${err.message}`);
	process.exit(1);
});
