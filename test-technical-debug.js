// 测试 technical 的识别问题
// 运行: node test-technical-debug.js

const sentence = "cies and technical issues.";
const word = "technical";

console.log("=== 问题分析 ===");
console.log(`句子: "${sentence}"`);
console.log(`单词: "${word}"`);
console.log("");

console.log("=== 当前系统的判断逻辑 ===");
console.log("1. 检查是否是分词 (participle):");
console.log(`   - 以 -ed 结尾? ${word.endsWith('ed')}`);
console.log(`   - 以 -ing 结尾? ${word.endsWith('ing')}`);
console.log(`   - 结论: 不是分词`);
console.log("");

console.log("2. 因为不是分词，applyHeuristics() 返回 'unknown'");
console.log("");

console.log("=== 问题根源 ===");
console.log("当前系统只能识别:");
console.log("  ✓ 分词 (-ed/-ing 结尾的词)");
console.log("  ✗ 普通形容词 (如 technical, important, beautiful)");
console.log("  ✗ 普通名词");
console.log("  ✗ 普通动词");
console.log("");

console.log("=== 解决方案 ===");
console.log("需要增强系统以识别非分词的词性:");
console.log("1. 添加形容词词典 (adjective dictionary)");
console.log("2. 添加名词词典 (noun dictionary)");
console.log("3. 使用词缀规则 (-al, -ous, -ive 等结尾通常是形容词)");
console.log("4. 使用上下文规则 (形容词通常在名词前)");
console.log("");

console.log("=== technical 的正确识别 ===");
console.log("technical 是形容词，因为:");
console.log("  - 以 -al 结尾 (形容词后缀)");
console.log("  - 在名词 'issues' 前面");
console.log("  - 修饰名词，描述其性质");
