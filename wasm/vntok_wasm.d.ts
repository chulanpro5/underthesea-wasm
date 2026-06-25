/* tslint:disable */
/* eslint-disable */

export class WsTokenizer {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * model_bytes = models.bin (CRFsuite), features_json/dictionary_json = JSON arrays of strings.
     */
    constructor(model_bytes: Uint8Array, features_json: string, dictionary_json: string);
    /**
     * Tag pre-tokenized syllables (newline-joined). Returns newline-joined B-W/I-W tags.
     */
    tag(tokens_joined: string): string;
}
