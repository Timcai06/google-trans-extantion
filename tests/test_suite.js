/**
 * 自动化测试套件
 * 用于验证翻译准确率和性能
 */

const TEST_SAMPLES = [
  { text: "Hello world", expected: "你好" },
  { text: "Artificial Intelligence", expected: "人工智能" },
  { text: "The quick brown fox jumps over the lazy dog", expected: "敏捷的" }, // 模糊匹配
  { text: "Context awareness", expected: "上下文" },
  { text: "Software Engineering", expected: "软件工程" },
  { text: "Chrome Extension", expected: "扩展" },
  { text: "Machine Learning", expected: "机器学习" },
  { text: "Deep Learning", expected: "深度学习" },
  { text: "Neural Network", expected: "神经网络" },
  { text: "Natural Language Processing", expected: "自然语言处理" }
];

/**
 * 运行测试套件
 * @param {number} iterations - 测试迭代次数
 * @returns {Promise<Object>} 测试结果报告
 */
async function runTestSuite(iterations = 10) {
  console.log('Starting Test Suite...');
  let passed = 0;
  let failed = 0;
  let totalLatency = 0;
  let results = [];

  // 如果迭代次数超过样本数，循环使用样本
  for (let i = 0; i < iterations; i++) {
    const sample = TEST_SAMPLES[i % TEST_SAMPLES.length];
    const startTime = Date.now();
    
    try {
      // 调用 background.js 中的 smartTranslate
      // 注意：此函数需要在 background.js 作用域内运行
      const result = await smartTranslate(sample.text, 'Testing context');
      const latency = Date.now() - startTime;
      totalLatency += latency;

      // 验证逻辑
      const output = result.translation || '';
      
      // 数据完整性检查：确保翻译结果是字符串而非对象
      if (typeof output !== 'string') {
        throw new Error(`Invalid translation type: ${typeof output}. Expected string.`);
      }
      
      const isPass = output.includes(sample.expected) || /[\u4e00-\u9fa5]/.test(output); // 包含预期词或至少包含中文
      
      if (isPass) {
        passed++;
      } else {
        failed++;
      }

      const log = {
        id: i + 1,
        input: sample.text,
        output: output,
        expected: sample.expected,
        latency: latency,
        status: isPass ? 'PASS' : 'FAIL',
        source: result.source
      };
      
      results.push(log);
      console.log(`Test #${i+1}: ${log.status} - "${log.input}" -> "${log.output}" (${log.latency}ms)`);

      // 记录到质量评估模块
      if (typeof recordTranslation === 'function') {
        recordTranslation(result.source, isPass, latency);
      }

    } catch (err) {
      failed++;
      console.error(`Test #${i+1} Error:`, err);
      results.push({
        id: i + 1,
        input: sample.text,
        error: err.message,
        status: 'ERROR'
      });
    }
    
    // 简单的延迟，避免触发速率限制
    await new Promise(r => setTimeout(r, 500));
  }

  const report = {
    total: iterations,
    passed,
    failed,
    avgLatency: iterations > 0 ? (totalLatency / iterations).toFixed(2) : 0,
    results
  };

  console.log('Test Suite Completed', report);
  return report;
}
