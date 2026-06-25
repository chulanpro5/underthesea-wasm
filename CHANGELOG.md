# Changelog

## 0.1.0

Initial release.

- Vietnamese word segmentation (`wordTokenize`) — an in-process WebAssembly port of underthesea's `word_tokenize`, with exact parity. No Python, no native addon, no network at runtime.
- TypeScript regex pre-tokenizer (port of `regex_tokenize` + `token_normalize` / `character_normalize`) → WASM CRF tagger (port of `underthesea_core`) → merge.
- Runs in Node ≥ 18 and Bun.
- Binary model + wasm hosted on a GitHub Release, fetched + sha256-verified at build time, bundled into the npm tarball for zero-network installs.
