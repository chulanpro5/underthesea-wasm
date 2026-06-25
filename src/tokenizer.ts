// Vietnamese word segmentation: regex pre-tokenize (TS) -> CRF tag (WASM) ->
// merge by I-W tags. Exact parity with underthesea's word_tokenize, in-process,
// no Python. Works in Node and Bun.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tokenize as regexTokenize } from "./regex-tokenize.js";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
// dist/tokenizer.js -> package root holds wasm/ and model/
const ROOT = join(HERE, "..");

type WsTokenizer = { tag(tokensJoined: string): string };
let tagger: WsTokenizer | null = null;

/**
 * Load the WASM module + CRF model. Called automatically on first tokenize;
 * call it explicitly to pay the one-time (~40ms) cost up front.
 */
export function init(): void {
	if (tagger) return;
	const wasm = require(join(ROOT, "wasm", "vntok_wasm.cjs"));
	const modelBytes = new Uint8Array(readFileSync(join(ROOT, "model", "models.bin")));
	const features = readFileSync(join(ROOT, "model", "features.json"), "utf8");
	const dictionary = readFileSync(join(ROOT, "model", "dictionary.json"), "utf8");
	tagger = new wasm.WsTokenizer(modelBytes, features, dictionary);
}

export type WordTokenizeFormat = "list" | "text";

/**
 * Segment a Vietnamese sentence into words.
 *
 * @param sentence raw input
 * @param format `"list"` (default) returns `string[]` with spaces inside words
 *   (e.g. `["Điều kiện", "kết hôn"]`); `"text"` returns a single underscore-joined
 *   string (e.g. `"Điều_kiện kết_hôn"`), matching underthesea's `format="text"`.
 */
export function wordTokenize(sentence: string, format: "text"): string;
export function wordTokenize(sentence: string, format?: "list"): string[];
export function wordTokenize(
	sentence: string,
	format: WordTokenizeFormat = "list",
): string | string[] {
	init();
	const tokens = regexTokenize(sentence);
	if (tokens.length === 0) return format === "text" ? "" : [];
	const tags = tagger!.tag(tokens.join("\n")).split("\n");
	const words: string[] = [];
	tokens.forEach((token, i) => {
		if (tags[i] === "I-W" && i > 0) words[words.length - 1] += ` ${token}`;
		else words.push(token);
	});
	return format === "text" ? words.map((w) => w.replace(/ /g, "_")).join(" ") : words;
}

/** Low-level: the regex pre-tokenizer (syllables + normalization), no CRF. */
export { regexTokenize as tokenize };
