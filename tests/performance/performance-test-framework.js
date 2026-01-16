/**
 * 性能测试框架
 * 用于测试组件的渲染和更新性能
 */

class PerformanceTestFramework {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
  }

  /**
   * 开始性能测试
   * @param {string} testName - 测试名称
   * @param {Object} options - 测试选项
   */
  startTest(testName, options = {}) {
    this.currentTest = {
      name: testName,
      startTime: performance.now(),
      iterations: options.iterations || 100,
      results: [],
      options
    };
    console.log(`开始性能测试: ${testName}`);
  }

  /**
   * 结束性能测试
   * @returns {Object} - 测试结果
   */
  endTest() {
    if (!this.currentTest) {
      throw new Error('没有正在运行的测试');
    }

    const endTime = performance.now();
    const totalTime = endTime - this.currentTest.startTime;
    const averageTime = totalTime / this.currentTest.iterations;
    const opsPerSecond = 1000 / averageTime;

    const result = {
      name: this.currentTest.name,
      iterations: this.currentTest.iterations,
      totalTime: totalTime.toFixed(2),
      averageTime: averageTime.toFixed(4),
      opsPerSecond: opsPerSecond.toFixed(2),
      results: this.currentTest.results
    };

    this.testResults.push(result);
    this.currentTest = null;

    console.log(`完成性能测试: ${result.name}`);
    console.log(`  迭代次数: ${result.iterations}`);
    console.log(`  总时间: ${result.totalTime}ms`);
    console.log(`  平均时间: ${result.averageTime}ms`);
    console.log(`  每秒操作数: ${result.opsPerSecond}`);

    return result;
  }

  /**
   * 运行单次性能测试
   * @param {Function} testFn - 测试函数
   */
  runIteration(testFn) {
    if (!this.currentTest) {
      throw new Error('没有正在运行的测试');
    }

    const iterationStart = performance.now();
    testFn();
    const iterationEnd = performance.now();
    const iterationTime = iterationEnd - iterationStart;

    this.currentTest.results.push(iterationTime);
  }

  /**
   * 运行完整性能测试
   * @param {string} testName - 测试名称
   * @param {Function} testFn - 测试函数
   * @param {Object} options - 测试选项
   * @returns {Object} - 测试结果
   */
  runTest(testName, testFn, options = {}) {
    this.startTest(testName, options);

    for (let i = 0; i < this.currentTest.iterations; i++) {
      this.runIteration(testFn);
    }

    return this.endTest();
  }

  /**
   * 测量函数执行时间
   * @param {Function} fn - 要测量的函数
   * @param {Array} args - 函数参数
   * @returns {Object} - 执行结果和时间
   */
  measureFunction(fn, args = []) {
    const start = performance.now();
    const result = fn.apply(null, args);
    const end = performance.now();
    
    return {
      result,
      time: end - start
    };
  }

  /**
   * 获取所有测试结果
   * @returns {Array} - 所有测试结果
   */
  getResults() {
    return this.testResults;
  }

  /**
   * 打印所有测试结果
   */
  printResults() {
    console.log('\n=== 性能测试结果汇总 ===');
    
    this.testResults.forEach(result => {
      console.log(`\n测试名称: ${result.name}`);
      console.log(`  迭代次数: ${result.iterations}`);
      console.log(`  总时间: ${result.totalTime}ms`);
      console.log(`  平均时间: ${result.averageTime}ms`);
      console.log(`  每秒操作数: ${result.opsPerSecond}`);
    });
  }

  /**
   * 保存测试结果到文件
   * @param {string} filePath - 文件路径
   */
  saveResults(filePath) {
    const fs = require('fs');
    const resultsData = {
      timestamp: new Date().toISOString(),
      results: this.testResults
    };
    
    fs.writeFileSync(filePath, JSON.stringify(resultsData, null, 2));
    console.log(`测试结果已保存到: ${filePath}`);
  }
}

// 导出性能测试框架
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceTestFramework;
} else if (typeof window !== 'undefined') {
  window.PerformanceTestFramework = PerformanceTestFramework;
}