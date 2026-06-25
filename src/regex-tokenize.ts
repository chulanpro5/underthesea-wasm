// Port of underthesea's regex_tokenize.py (sentence -> syllable tokens) + the
// token_normalize / character_normalize steps. JS regex matches Python `re`
// semantics for lookaround and named groups; the two adaptations are:
//   - re.VERBOSE: stripped via compactVerbose() (whitespace + # comments)
//   - re.UNICODE \w: rewritten to \p{L}\p{N}_ (JS \w is ASCII-only)

const UPPER =
	"[" +
	["A-Z", "ÀÁẢÃẠ", "ĂẰẮẲẴẶ", "ÂẦẤẨẪẬ", "Đ", "ÈÉẺẼẸ", "ÊỀẾỂỄỆ", "ÌÍỈĨỊ",
		"ÒÓỎÕỌ", "ÔỒỐỔỖỘ", "ƠỜỚỞỠỢ", "ÙÚỦŨỤ", "ƯỪỨỬỮỰ", "ỲÝỶỸỴ"].join("") +
	"]";
const LOWER = UPPER.toLowerCase();
const W = "[" + UPPER.slice(1, -1) + LOWER.slice(1, -1) + "]";

const specials = "(?<special>(" + [
	"=\\>", "==>", "->", "\\.{2,}", "-{2,}", ">>", "\\d+x\\d+",
	"v\\.v\\.\\.\\.", "v\\.v\\.", "v\\.v", "°[CF]",
].join("|") + "))";

const abbreviations = "(?<abbr>(" + [
	"[A-ZĐ]+&[A-ZĐ]+", "T\\.Ư", `${UPPER}+(?:\\.${W}+)+\\.?`, `${W}+['’]${W}+`,
	"[A-ZĐ]+\\.(?!$)", "Tp\\.", "Mr\\.", "Mrs\\.", "Ms\\.",
	"Dr\\.", "ThS\\.", "Th.S", "Th.s", "e-mail", "\\d+[A-Z]+\\d*-\\d+", "NĐ-CP",
].join("|") + "))";

// url: verbose in Python; compactVerbose() handles the whitespace/comments.
const url = "(?<url>" + `
  (?:
  (ftp|http)s?:
    (?:
      /{1,3}
      |
      [a-z0-9%]
    )
    |
    [a-z0-9.\\-]+[.]
    (?:[a-z]{2,13})
    /
  )
  (?:
    [^\\s()<>{}\\[\\]]+
    |
    \\([^\\s()]*?\\([^\\s()]+\\)[^\\s()]*?\\)
    |
    \\([^\\s]+?\\)
  )+
  (?:
    \\([^\\s()]*?\\([^\\s()]+\\)[^\\s()]*?\\)
    |
    \\([^\\s]+?\\)
    |
    [^\\s\`!()\\[\\]{};:'".,<>?«»“”‘’]
  )
  |
  (?:
    (?<!@)
    [a-z0-9]+
    (?:[.\\-][a-z0-9]+)*
    [.]
    (?:[a-z]{2,13})
    \\b
    /?
    (?!@)
  )
` + ")";

const email = "(?<email>" + "[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+" + ")";
const phone = "(?<phone>(" + "\\d{2,}-\\d{3,}-\\d{3,}" + "))";
const datetime = "(?<datetime>(" + [
	"\\d{1,2}\\/\\d{1,2}\\/\\d+", "\\d{1,2}\\/\\d{1,4}", "\\d{1,2}-\\d{1,2}-\\d+",
	"\\d{1,2}-\\d{1,4}", "\\d{1,2}\\.\\d{1,2}\\.\\d+", "\\d{4}\\/\\d{1,2}\\/\\d{1,2}",
	"\\d{2}:\\d{2}:\\d{2}",
].join("|") + "))";
const name = "(?<name>(" + ["\\d+[A-Z]+\\d+", "\\d+[A-Z]+"].join("|") + "))";
const number = "(?<number>(" + [
	"\\d+(?:\\.\\d+)+,\\d+", "\\d+(?:\\.\\d+)+", "\\d+(?:,\\d+)+", "\\d+(?:[\\.,_]\\d+)?",
].join("|") + "))";
const emoji = "(?<emoji>(" + [
	":\\)\\)*", "=\\)\\)+", "♥‿♥", ":D+(?=\\s)", ":D+(?=$)", "<3",
].join("|") + "))";
const punct = "(?<punct>(" + ["\\.", "\\,", "\\(", "\\)", "ʺ"].join("|") + "))";
const word = "(?<word>\\w+)";
const word_hyphen = "(?<word_hyphen>(" + "(?<=\\b)\\w+\\-[\\w+-]*\\w+" + "))";
const symbol = "(?<sym>(" + [
	"\\+", "×", "-", "÷", ":+", "%", "%", "\\$", "\\>", "\\<", "=", "\\^", "_", ":+",
].join("|") + "))";
const non_word = "(?<non_word>[^\\w\\s])";

const groups = [
	specials, abbreviations, url, email, phone, datetime, name, number,
	emoji, punct, word_hyphen, word, symbol, non_word,
];
const GROUP_NAMES = ["special", "abbr", "url", "email", "phone", "datetime",
	"name", "number", "emoji", "punct", "word_hyphen", "word", "sym", "non_word"];

/** Replicate Python re.VERBOSE: drop whitespace + #-comments, respecting [] and \. */
function compactVerbose(src: string): string {
	let out = "";
	let inClass = false;
	for (let i = 0; i < src.length; i++) {
		const c = src[i]!;
		if (c === "\\") {
			out += c + (src[i + 1] ?? "");
			i++;
			continue;
		}
		if (inClass) {
			out += c;
			if (c === "]") inClass = false;
			continue;
		}
		if (c === "[") {
			inClass = true;
			out += c;
			continue;
		}
		if (c === "#") {
			while (i < src.length && src[i] !== "\n") i++;
			continue;
		}
		if (c === " " || c === "\t" || c === "\n" || c === "\r") continue;
		out += c;
	}
	return out;
}

/** Rewrite \w/\W to Unicode classes (Python re.UNICODE), class-aware. */
function unicodeWordClasses(src: string): string {
	let out = "";
	let inClass = false;
	for (let i = 0; i < src.length; i++) {
		const c = src[i]!;
		if (c === "\\") {
			const n = src[i + 1];
			if (n === "w") {
				out += inClass ? "\\p{L}\\p{N}_" : "[\\p{L}\\p{N}_]";
				i++;
				continue;
			}
			if (n === "W") {
				out += inClass ? "" : "[^\\p{L}\\p{N}_]"; // \W not used inside classes here
				i++;
				continue;
			}
			out += c + (n ?? "");
			i++;
			continue;
		}
		if (c === "[") inClass = true;
		else if (c === "]") inClass = false;
		out += c;
	}
	return out;
}

// JS `u` mode forbids escaping non-special chars (e.g. \> \, \< ` ), which
// Python's `re` allows. Strip those backslashes, class-aware.
function sanitizeEscapes(src: string): string {
	// Always-valid escape chars after backslash (recognized escapes + syntax chars).
	const RECOGNIZED = new Set("dDwWsSbBpPuxcfnrtv0123456789".split(""));
	const SYNTAX = new Set("^$.*+?()[]{}|/\\".split(""));
	let out = "";
	let inClass = false;
	for (let i = 0; i < src.length; i++) {
		const c = src[i]!;
		if (c === "\\") {
			const n = src[i + 1] ?? "";
			const keep =
				RECOGNIZED.has(n) || SYNTAX.has(n) || (n === "-" && inClass);
			out += keep ? c + n : n; // drop the backslash for invalid identity escapes
			i++;
			continue;
		}
		if (c === "[") inClass = true;
		else if (c === "]") inClass = false;
		out += c;
	}
	return out;
}

const combined = sanitizeEscapes(unicodeWordClasses(compactVerbose("(" + groups.join("|") + ")")));
const PATTERN = new RegExp(combined, "gu");

// --- normalization ---
// Load the maps via fs (not a JSON import) so it works across Node ESM versions
// without import assertions, in Bun, and from the compiled dist/ output.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const charMap = JSON.parse(
	readFileSync(join(HERE, "character_map.json"), "utf8"),
) as Record<string, string>;
const tokMap = JSON.parse(
	readFileSync(join(HERE, "token_map.json"), "utf8"),
) as Record<string, string>;

function characterNormalize(text: string): string {
	for (const [from, to] of Object.entries(charMap)) text = text.split(from).join(to);
	return text;
}
function normalizeCharactersInText(text: string): string {
	return characterNormalize(text.normalize("NFC"));
}
function tokenNormalize(token: string): string {
	if (token.length > 6) return token;
	token = normalizeCharactersInText(token);
	return tokMap[token] ?? token;
}

export function tokenize(text: string): string[] {
	const normalized = normalizeCharactersInText(text);
	const tokens: string[] = [];
	for (const m of normalized.matchAll(PATTERN)) {
		// extract_match: first non-undefined named group, in priority order
		const g = m.groups!;
		for (const nameKey of GROUP_NAMES) {
			if (g[nameKey] !== undefined) {
				tokens.push(m[0]);
				break;
			}
		}
	}
	return tokens.map((t) => tokenNormalize(t));
}
