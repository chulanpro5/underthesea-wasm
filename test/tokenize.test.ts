import { expect, test } from "bun:test";
import { tokenize, wordTokenize } from "../src/index.js";

test("word_tokenize format=text matches underthesea", () => {
	expect(
		wordTokenize("Điều kiện kết hôn theo Luật Hôn nhân và gia đình là gì?", "text"),
	).toBe("Điều_kiện kết_hôn theo Luật Hôn_nhân và gia_đình là gì ?");
});

test("word_tokenize list form keeps spaces inside words", () => {
	expect(wordTokenize("Bác sĩ bây giờ có thể")).toEqual([
		"Bác sĩ",
		"bây giờ",
		"có thể",
	]);
});

test("document numbers, datetimes and abbreviations", () => {
	expect(
		wordTokenize("Nghị định 100/2019/NĐ-CP quy định xử phạt", "text"),
	).toBe("Nghị_định 100 / 2019 / NĐ-CP quy_định xử_phạt");
});

test("urls stay intact", () => {
	expect(tokenize("Truy cập https://thuvienphapluat.vn ngay")).toEqual([
		"Truy",
		"cập",
		"https://thuvienphapluat.vn",
		"ngay",
	]);
});

test("empty input", () => {
	expect(wordTokenize("")).toEqual([]);
	expect(wordTokenize("", "text")).toBe("");
});
