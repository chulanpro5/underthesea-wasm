import { tokenize, wordTokenize } from "../src/index.js";

const sentences = [
	"Bác sĩ bây giờ có thể thản nhiên báo tin bệnh nhân bị ung thư",
	"Điều kiện kết hôn theo Luật Hôn nhân và gia đình là gì?",
	"Nghị định 100/2019/NĐ-CP quy định xử phạt vi phạm hành chính",
];

for (const s of sentences) {
	console.log("input :", s);
	console.log("list  :", wordTokenize(s));
	console.log("text  :", wordTokenize(s, "text"));
	console.log("syllab:", tokenize(s));
	console.log();
}
