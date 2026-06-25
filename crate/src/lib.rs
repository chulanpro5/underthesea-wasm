//! WASM word-segmentation tokenizer: a thin wrapper over underthesea_core's
//! Rust CRF featurizer + tagger. Exact parity with underthesea's word_tokenize,
//! running in-process via WebAssembly (no Python).

mod crf;
mod featurizers;

use crf::{CRFFormat, CRFTagger, ModelLoader};
use std::collections::HashSet;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct WsTokenizer {
    featurizer: featurizers::CRFFeaturizer,
    tagger: CRFTagger,
}

#[wasm_bindgen]
impl WsTokenizer {
    /// model_bytes = models.bin (CRFsuite), features_json/dictionary_json = JSON arrays of strings.
    #[wasm_bindgen(constructor)]
    pub fn new(
        model_bytes: Vec<u8>,
        features_json: &str,
        dictionary_json: &str,
    ) -> Result<WsTokenizer, JsError> {
        let feature_configs: Vec<String> =
            serde_json::from_str(features_json).map_err(|e| JsError::new(&format!("features: {e}")))?;
        let dict_vec: Vec<String> =
            serde_json::from_str(dictionary_json).map_err(|e| JsError::new(&format!("dict: {e}")))?;
        let dictionary: HashSet<String> = dict_vec.into_iter().collect();
        let model = ModelLoader::new()
            .load_bytes(model_bytes, CRFFormat::Auto)
            .map_err(|e| JsError::new(&e))?;
        Ok(WsTokenizer {
            featurizer: featurizers::CRFFeaturizer::new(feature_configs, dictionary),
            tagger: CRFTagger::from_model(model),
        })
    }

    /// Tag pre-tokenized syllables (newline-joined). Returns newline-joined B-W/I-W tags.
    pub fn tag(&self, tokens_joined: &str) -> String {
        if tokens_joined.is_empty() {
            return String::new();
        }
        let tokens: Vec<String> = tokens_joined.split('\n').map(|s| s.to_string()).collect();
        let sentence: Vec<Vec<String>> = tokens.iter().map(|t| vec![t.clone()]).collect();
        let mut processed = self.featurizer.process(vec![sentence]);
        let token_feats = processed.remove(0);
        self.tagger.tag(&token_feats).join("\n")
    }
}
