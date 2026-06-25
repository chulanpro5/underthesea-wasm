//! CRF inference subset (no trainer) for the WASM word tokenizer.
pub mod crfsuite_format;
pub mod features;
pub mod model;
pub mod serialization;
pub mod tagger;

pub use model::CRFModel;
pub use serialization::{CRFFormat, ModelLoader};
pub use tagger::CRFTagger;
