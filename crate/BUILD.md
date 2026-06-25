# crate — Rust source for the WASM CRF tagger

This is the Rust code behind `../wasm/vntok_wasm_bg.wasm`. It is a trimmed fork of [`underthesea_core`](https://github.com/undertheseanlp/underthesea/tree/main/extensions/underthesea_core) (GPL-3.0): the `featurizers` module plus the `crf` inference subset (tagger / model / serialization / features / crfsuite_format). Removed: PyO3 bindings, the trainer, and the `rayon`/SVM/TF-IDF modules. The model loader is patched to read from in-memory bytes (`ModelLoader::load_bytes`) instead of a file path, since WASM has no filesystem.

The full word segmentation pipeline is: the TS regex tokenizer (`../src/regex-tokenize.ts`) → this WASM CRF tagger → merge by `I-W` tags (`../src/tokenizer.ts`).

## Rebuild

Requires the Rust toolchain and a `wasm-bindgen-cli` whose version matches the `wasm-bindgen` crate dependency (currently 0.2.126):

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.126

cargo build --release --target wasm32-unknown-unknown
wasm-bindgen --target nodejs --out-dir pkg \
  target/wasm32-unknown-unknown/release/vntok_wasm.wasm

# optional: shrink the wasm ~30% (needs binaryen)
wasm-opt -Oz pkg/vntok_wasm_bg.wasm -o pkg/vntok_wasm_bg.wasm

# publish the bindings into the package, renaming the CJS glue to .cjs so Node
# (an ESM "type": "module" package) loads it as CommonJS:
cp pkg/vntok_wasm_bg.wasm ../wasm/
cp pkg/vntok_wasm.d.ts pkg/vntok_wasm_bg.wasm.d.ts ../wasm/
cp pkg/vntok_wasm.js ../wasm/vntok_wasm.cjs
```

## Publishing the assets

The wasm binary and the model are **not committed to git** — they're hosted on a GitHub Release and fetched by `scripts/fetch-model.mjs`. After rebuilding:

1. Upload `vntok_wasm_bg.wasm`, `models.bin`, and `dictionary.json` to the Release tagged in `../model-assets.json` (default `models-v1`).
2. Update each `sha256` in `../model-assets.json` (`shasum -a 256 <file>`).
3. `npm run fetch:model` to verify they download + match.

## Model artifacts (`../model/`)

- `models.bin` — CRFsuite-format CRF model (`ws_crf_vlsp2013_20230727`)
- `features.json` — 43 feature templates (from the package's `features.bin`)
- `dictionary.json` — 72,547-word dictionary (from `dictionary.bin`)

…plus `../src/character_map.json` and `../src/token_map.json` (from `tn_rules_2023_07_14.bin`), used by the regex tokenizer's normalization step.

To regenerate from a fresh underthesea release: `pickle.load` those `.bin` files (joblib dumps of plain lists/sets/dicts) and dump to JSON; copy `models.bin` as-is.

## License

Derived from underthesea / underthesea_core — **GPL-3.0-only**.
