/**
 * 高亮性能测试
 * 用于验证虚拟化高亮组件的性能表现
 */

class HighlightPerformanceTest {
  constructor() {
    this.testResults = [];
    this.testWords = this.generateTestWords(1000);
  }

  /**
   * 生成测试单词
   */
  generateTestWords(count) {
    const words = {};
    const commonWords = [
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
      'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
      'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
      'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
      'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
      'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
      'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
      'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had',
      'were', 'said', 'did', 'get', 'may', 'can', 'shall', 'will', 'just',
      'would', 'should', 'could', 'might', 'must', 'ought', 'need', 'dare'
    ];

    for (let i = 0; i < count && i < commonWords.length; i++) {
      const word = commonWords[i];
      words[word] = {
        translation: `${word}_翻译_${i}`,
        type: 'word',
        count: Math.floor(Math.random() * 100) + 1,
        partOfSpeech: ['noun', 'verb', 'adjective', 'adverb'][Math.floor(Math.random() * 4)]
      };
    }

    return words;
  }

  /**
   * 创建测试内容
   */
  createTestContent() {
    const content = document.createElement('div');
    content.style.cssText = `
      position: fixed;
      top: 50px;
      left: 50px;
      right: 50px;
      bottom: 50px;
      background: white;
      padding: 20px;
      border: 2px solid #ccc;
      border-radius: 8px;
      overflow-y: auto;
      z-index: 1000;
      font-size: 16px;
      line-height: 1.6;
    `;

    // 生成大量文本内容
    let text = '';
    for (let i = 0; i < 100; i++) {
      text += `This is a test paragraph number ${i + 1}. `;
      text += `The quick brown fox jumps over the lazy dog. `;
      text += `Performance testing is important for web applications. `;
      text += `We need to ensure that highlighting works efficiently. `;
      text += `The the be to of and a in that have I it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is was are been has had were said did get may can shall will just would should could might must ought need dare `;
    }

    content.innerHTML = `<p>${text}</p>`;
    document.body.appendChild(content);

    return content;
  }

  /**
   * 运行性能测试
   */
  async runPerformanceTest() {
    console.log('开始高亮性能测试...');

    // 创建测试内容
    const testContent = this.createTestContent();

    // 测试场景
    const testScenarios = [
      { name: '小规模测试', wordCount: 100, iterations: 5 },
      { name: '中规模测试', wordCount: 500, iterations: 3 },
      { name: '大规模测试', wordCount: 1000, iterations: 1 }
    ];

    for (const scenario of testScenarios) {
      console.log(`运行测试场景: ${scenario.name}`);
      
      const words = this.generateTestWords(scenario.wordCount);
      const results = [];

      for (let i = 0; i < scenario.iterations; i++) {
        const result = await this.runSingleTest(words, `${scenario.name} - 第${i + 1}次`);
        results.push(result);
        
        // 清理高亮
        if (window.highlightManager) {
          window.highlightManager.removeAllHighlights();
        }
        
        // 等待一段时间再进行下一次测试
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 计算平均结果
      const avgResult = this.calculateAverage(results);
      this.testResults.push({
        scenario: scenario.name,
        wordCount: scenario.wordCount,
        ...avgResult
      });
    }

    // 显示测试结果
    this.displayResults();

    // 清理测试内容
    testContent.remove();
  }

  /**
   * 运行单次测试
   */
  async runSingleTest(words, testName) {
    // 清理之前的高亮
    if (window.highlightManager) {
      window.highlightManager.removeAllHighlights();
    }

    // 记录开始时间
    const startTime = performance.now();
    const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

    // 执行高亮
    if (window.highlightManager) {
      await window.highlightManager.highlightTranslatedWords(words);
    }

    // 记录结束时间
    const endTime = performance.now();
    const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

    // 等待渲染完成
    await new Promise(resolve => setTimeout(resolve, 500));

    // 获取高亮元素数量
    const highlightCount = document.querySelectorAll('.translated-word-highlight').length;

    return {
      testName,
      processingTime: endTime - startTime,
      memoryUsage: endMemory - startMemory,
      highlightCount,
      fps: this.measureFPS(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 测量 FPS
   */
  measureFPS() {
    return new Promise(resolve => {
      let frames = 0;
      const startTime = performance.now();

      const countFrames = () => {
        frames++;
        const currentTime = performance.now();

        if (currentTime >= startTime + 1000) {
          resolve(frames);
          return;
        }

        requestAnimationFrame(countFrames);
      };

      requestAnimationFrame(countFrames);
    });
  }

  /**
   * 计算平均值
   */
  calculateAverage(results) {
    if (results.length === 0) return {};

    const sum = results.reduce((acc, result) => ({
      processingTime: acc.processingTime + result.processingTime,
      memoryUsage: acc.memoryUsage + result.memoryUsage,
      highlightCount: acc.highlightCount + result.highlightCount,
      fps: acc.fps + result.fps
    }), { processingTime: 0, memoryUsage: 0, highlightCount: 0, fps: 0 });

    return {
      avgProcessingTime: sum.processingTime / results.length,
      avgMemoryUsage: sum.memoryUsage / results.length,
      avgHighlightCount: sum.highlightCount / results.length,
      avgFPS: sum.fps / results.length,
      testCount: results.length
    };
  }

  /**
   * 显示测试结果
   */
  displayResults() {
    console.log('\n=== 高亮性能测试结果 ===');
    
    this.testResults.forEach(result => {
      console.log(`\n${result.scenario}:`);
      console.log(`  单词数量: ${result.wordCount}`);
      console.log(`  平均处理时间: ${result.avgProcessingTime.toFixed(2)} ms`);
      console.log(`  平均内存使用: ${(result.avgMemoryUsage / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  平均高亮数量: ${Math.round(result.avgHighlightCount)}`);
      console.log(`  平均 FPS: ${result.avgFPS.toFixed(1)}`);
      console.log(`  测试次数: ${result.testCount}`);
      
      // 性能评级
      const performanceGrade = this.getPerformanceGrade(result.avgProcessingTime, result.avgMemoryUsage);
      console.log(`  性能评级: ${performanceGrade}`);
    });

    // 创建结果面板
    this.createResultsPanel();
  }

  /**
   * 获取性能评级
   */
  getPerformanceGrade(processingTime, memoryUsage) {
    if (processingTime < 100 && memoryUsage < 10 * 1024 * 1024) return 'A+ (优秀)';
    if (processingTime < 200 && memoryUsage < 20 * 1024 * 1024) return 'A (良好)';
    if (processingTime < 500 && memoryUsage < 50 * 1024 * 1024) return 'B (一般)';
    if (processingTime < 1000 && memoryUsage < 100 * 1024 * 1024) return 'C (较差)';
    return 'D (很差)';
  }

  /**
   * 创建结果面板
   */
  createResultsPanel() {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      font-family: Arial, sans-serif;
    `;

    let html = '<h2>高亮性能测试结果</h2>';
    html += '<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">';
    html += '<tr style="background: #f5f5f5;"><th>测试场景</th><th>单词数量</th><th>处理时间</th><th>内存使用</th><th>FPS</th><th>评级</th></tr>';

    this.testResults.forEach(result => {
      const performanceGrade = this.getPerformanceGrade(result.avgProcessingTime, result.avgMemoryUsage);
      html += `<tr style="border-bottom: 1px solid #ddd;">`;
      html += `<td style="padding: 8px;">${result.scenario}</td>`;
      html += `<td style="padding: 8px;">${result.wordCount}</td>`;
      html += `<td style="padding: 8px;">${result.avgProcessingTime.toFixed(2)} ms</td>`;
      html += `<td style="padding: 8px;">${(result.avgMemoryUsage / 1024 / 1024).toFixed(2)} MB</td>`;
      html += `<td style="padding: 8px;">${result.avgFPS.toFixed(1)}</td>`;
      html += `<td style="padding: 8px; font-weight: bold; color: ${this.getGradeColor(performanceGrade)}">${performanceGrade}</td>`;
      html += `</tr>`;
    });

    html += '</table>';
    html += '<button onclick="this.parentElement.remove()" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 20px;">关闭</button>';

    panel.innerHTML = html;
    document.body.appendChild(panel);
  }

  /**
   * 获取评级颜色
   */
  getGradeColor(grade) {
    if (grade.includes('A+')) return '#4CAF50';
    if (grade.includes('A')) return '#8BC34A';
    if (grade.includes('B')) return '#FF9800';
    if (grade.includes('C')) return '#FF5722';
    return '#F44336';
  }
}

// 创建测试实例
window.highlightPerformanceTest = new HighlightPerformanceTest();

// 添加测试命令
console.log('高亮性能测试已加载。使用以下命令运行测试:');
console.log('window.highlightPerformanceTest.runPerformanceTest()');

// 导出测试类
module.exports = HighlightPerformanceTest;
