/**
 * 简单的单元测试框架
 * 用于组件的单元测试
 */

class TestFramework {
  constructor() {
    this.testSuites = {};
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  /**
   * 创建测试套件
   * @param {string} name - 测试套件名称
   * @returns {Object} - 测试套件对象
   */
  suite(name) {
    const suite = {
      tests: [],
      beforeEach: null,
      afterEach: null,
      name
    };
    
    this.testSuites[name] = suite;
    
    return {
      test: (testName, testFn) => {
        suite.tests.push({ name: testName, fn: testFn });
      },
      beforeEach: (fn) => {
        suite.beforeEach = fn;
      },
      afterEach: (fn) => {
        suite.afterEach = fn;
      }
    };
  }

  /**
   * 断言函数
   */
  assert(condition, message = 'Assertion failed') {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertDeepEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  assertThrows(fn, expectedError, message = '') {
    try {
      fn();
      throw new Error(message || `Expected error ${expectedError}, but no error was thrown`);
    } catch (err) {
      if (err.message !== expectedError) {
        throw new Error(message || `Expected error ${expectedError}, got ${err.message}`);
      }
    }
  }

  /**
   * 运行所有测试
   * @returns {Object} - 测试结果
   */
  async run() {
    console.log('=== 开始运行单元测试 ===');
    
    for (const suiteName in this.testSuites) {
      const suite = this.testSuites[suiteName];
      console.log(`\n--- 测试套件: ${suiteName} ---`);
      
      for (const test of suite.tests) {
        this.results.total++;
        
        try {
          // 运行前置钩子
          if (suite.beforeEach) {
            await suite.beforeEach();
          }
          
          // 运行测试
          await test.fn();
          
          console.log(`✅ ${test.name}`);
          this.results.passed++;
        } catch (error) {
          console.log(`❌ ${test.name}: ${error.message}`);
          this.results.failed++;
        } finally {
          // 运行后置钩子
          if (suite.afterEach) {
            try {
              await suite.afterEach();
            } catch (hookError) {
              console.error(`钩子执行错误: ${hookError.message}`);
            }
          }
        }
      }
    }
    
    console.log('\n=== 测试结果汇总 ===');
    console.log(`总测试数: ${this.results.total}`);
    console.log(`通过: ${this.results.passed}`);
    console.log(`失败: ${this.results.failed}`);
    console.log(`通过率: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`);
    
    return this.results;
  }
}

// 导出测试框架
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestFramework;
} else if (typeof window !== 'undefined') {
  window.TestFramework = TestFramework;
}