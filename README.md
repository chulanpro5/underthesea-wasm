# underthesea-wasm

Vietnamese **word segmentation** in JavaScript/TypeScript — an unofficial, in-process **WebAssembly** port of [underthesea](https://github.com/undertheseanlp/underthesea)'s `word_tokenize`. Same CRF model, **exact parity**, **no Python**, no native addon, no separate service. Runs in Node and Bun.

```ts
import { wordTokenize } from "underthesea-wasm";

wordTokenize("Bác sĩ bây giờ có thể thản nhiên báo tin");
// [ "Bác sĩ", "bây giờ", "có thể", "thản nhiên", "báo", "tin" ]

wordTokenize("Điều kiện kết hôn theo Luật Hôn nhân và gia đình", "text");
// "Điều_kiện kết_hôn theo Luật Hôn_nhân và gia_đình"
```

## Why

underthesea's tokenizer is a CRF model wrapped in a Rust core (`underthesea_core`) behind Python. This package ports the **inference path** to WebAssembly and the **regex pre-tokenizer** to TypeScript, so you get byte-for-byte identical segmentation without a Python runtime or a network round-trip.

## Scope

underthesea is a large toolkit with two top-level areas — an **`agent`** feature and an **NLP `pipeline`** (word_tokenize, pos_tag, ner, chunking, dependency_parse, sentiment, classification, lang_detect, sent_tokenize, ipa, text_normalize, translate, tts).

**This package ports exactly one of them: `word_tokenize`** (Vietnamese word segmentation). The agent feature and every other NLP task are **not** included. Specifically ported: `word_tokenize` = `regex_tokenize` + the `token_normalize` / `character_normalize` steps it uses + the `underthesea_core` CRF featurizer & tagger (inference only). Not ported: the CRF trainer, the other `underthesea_core` algorithms (LR / SVM / TF-IDF / FastText), and all other pipeline tasks.

## Install

```bash
npm install underthesea-wasm
# or: bun add underthesea-wasm
```

**Zero-network install.** The published npm tarball **bundles** the `.wasm` (~1.1 MB) and the CRF model (~6 MB), so installing as a dependency needs no download and works offline.

The **git repo** keeps those binaries out of version control — they're hosted on a GitHub Release and fetched at build time (see *Building from source* below).

## API

```ts
import { wordTokenize, tokenize, init } from "underthesea-wasm";

// Segment into words (default: list, spaces inside multi-syllable words)
wordTokenize(sentence): string[]
// underthesea format="text" (underscore-joined)
wordTokenize(sentence, "text"): string

// Low-level: regex pre-tokenizer only (syllables + normalization), no CRF
tokenize(sentence): string[]

// Optional: pay the one-time (~40 ms) model load up front
init(): void
```

Calls are **synchronous**. The model loads lazily on the first call (or via `init()`), then each `wordTokenize` is ~1–2 ms.

## How it works

```
sentence ─► regex-tokenize (TS)  ─► CRF tag (WASM)  ─► merge by I-W tags ─► words
            underthesea regex_tokenize   underthesea_core      word boundaries
            + token/char normalize       featurizer + Viterbi
```

- **`src/regex-tokenize.ts`** — a faithful port of underthesea's `regex_tokenize.py` (+ `token_normalize` / `character_normalize`). Python `re.VERBOSE` and `re.UNICODE \w` are reproduced; lookarounds map directly to JS regex.
- **`wasm/`** — `underthesea_core`'s Rust CRF featurizer + tagger, compiled to `wasm32` (PyO3 / trainer / threads stripped, model loader patched to read bytes). Source in [`crate/`](./crate); rebuild steps in [`crate/BUILD.md`](./crate/BUILD.md).
- **`model/`** — the `ws_crf_vlsp2013_20230727` CRF model (`models.bin`), its 43 feature templates (`features.json`), and the 72,547-word dictionary (`dictionary.json`), extracted from the underthesea package.

## Parity

Validated against the reference Python implementation:

- regex pre-tokenizer: **exact** on a tricky corpus (URLs, emails, emoji, decimals, datetimes, vehicle plates, `NĐ-CP`, hyphenated names, `°C`).
- CRF tags: **exact** vs the `underthesea_core` wheel (same Rust code).
- full `word_tokenize`: **exact** end-to-end.

## Building from source

You don't need this to *use* the package (npm bundles everything). For development:

```bash
git clone … && cd underthesea-wasm
npm install            # `prepare` fetches the model + wasm, then builds
npm test
```

### Model assets

The binary assets (`model/models.bin`, `model/dictionary.json`, `wasm/vntok_wasm_bg.wasm`) are **not in git**. They're published as a GitHub Release asset and listed in [`model-assets.json`](./model-assets.json) with a pinned `sha256`. [`scripts/fetch-model.mjs`](./scripts/fetch-model.mjs) downloads + verifies them (idempotent), runs automatically via `npm install` (the `prepare` script), and is included in the npm tarball at publish time.

```bash
npm run fetch:model    # manual fetch / re-verify
# UNDERTHESEA_WASM_ASSETS_BASEURL=… npm run fetch:model   # use a mirror
```

To **rebuild the WASM** from the Rust source, see [`crate/BUILD.md`](./crate/BUILD.md).

## Limitations

- Word segmentation only (`word_tokenize`). POS tagging, NER, etc. are not ported.
- Node ≥ 18 / Bun. The WASM bindings use the `nodejs` target (filesystem read of the model); a browser/bundler target isn't provided yet.

## License & attribution

**This package is licensed `GPL-3.0-only`.** See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE).

It is a derivative of [underthesea](https://github.com/undertheseanlp/underthesea) — all credit to the underthesea authors for the model and the original code. Upstream licensing is **mixed/ambiguous**, so we chose the conservative option:

| Upstream piece we derive from | Upstream declaration |
|---|---|
| `regex_tokenize`, `token_normalize`/`character_normalize`, the model files (main `underthesea` repo) | **Apache-2.0** (repo `LICENSE` + pyproject) |
| `underthesea_core` CRF code (`crate/`) | **GPL-3.0** (its `Cargo.toml`) — though that crate's pyproject says Apache-2.0 |

Because the forked CRF code is declared GPL-3.0 by its `Cargo.toml`, and because Apache-2.0 is one-way compatible with GPL-3.0, we license the **combined work as `GPL-3.0-only`** — compliant under either reading of the upstream ambiguity. If you need a more permissive license, ask the underthesea maintainers to clarify `underthesea_core`'s license first.

> **Model/data note:** the CRF model (`ws_crf_vlsp2013_20230727`) was trained on the VLSP 2013 corpus. Verify the VLSP data/model terms for your own use case (research vs commercial); that is separate from this code's license.

This project is **not affiliated with or endorsed by** the underthesea project.
