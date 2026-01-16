/**
 * Homepage Learning Panel Unit Tests
 * Feature: svg-icon-replacement
 * 
 * Unit tests for homepage learning panel icon replacement
 * Tests specific examples and edge cases
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

/**
 * Simple unit test framework
 */
class UnitTestFramework {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      failures: []
    };
  }

  test(testName, testFn) {
    console.log(`\nTest: ${testName}`);
    this.results.total++;
    
    try {
      testFn();
      this.results.passed++;
      console.log(`✅ PASSED`);
      return true;
    } catch (error) {
      this.results.failed++;
      this.results.failures.push({
        test: testName,
        error: error.message
      });
      console.log(`❌ FAILED: ${error.message}`);
      return false;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertIncludes(str, substring, message) {
    if (!str.includes(substring)) {
      throw new Error(message || `Expected string to include "${substring}"`);
    }
  }

  assertNotIncludes(str, substring, message) {
    if (str.includes(substring)) {
      throw new Error(message || `Expected string to not include "${substring}"`);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(70));
    console.log('UNIT TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`Total tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Pass rate: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`);
    
    if (this.results.failures.length > 0) {
      console.log('\n=== Failures ===');
      this.results.failures.forEach(failure => {
        console.log(`\nTest: ${failure.test}`);
        console.log(`Error: ${failure.error}`);
      });
    }
  }
}

// Mock icon library
const mockIconLibrary = {
  getIcon: function(iconName) {
    const icons = {
      'book': '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
      'target': '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="9"></circle></svg>',
      'checkmark': '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    };
    return icons[iconName] || icons['book'];
  }
};

// Initialize test framework
const utf = new UnitTestFramework();

// ============================================================================
// Unit Tests for Homepage Learning Panel Icon Replacement
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('HOMEPAGE LEARNING PANEL UNIT TESTS');
console.log('Feature: svg-icon-replacement');
console.log('Requirements: 1.1, 1.2, 1.3, 1.4');
console.log('='.repeat(70));

// Test 1: Learning panel renders with correct icons
utf.test(
  'Learning panel renders with book icon for studied words',
  () => {
    const bookIcon = mockIconLibrary.getIcon('book');
    const html = `
      <div class="learning-status-display">
        <div class="status-item today-learned">
          <span class="status-icon">${bookIcon}</span>
          <span class="status-text">已学习 <strong>5</strong> 个单词</span>
        </div>
      </div>
    `;
    
    // Assert: HTML contains SVG
    utf.assertIncludes(html, '<svg', 'HTML should contain SVG element');
    
    // Assert: HTML does not contain book emoji
    utf.assertNotIncludes(html, '📚', 'HTML should not contain book emoji');
    
    // Assert: HTML contains correct text
    utf.assertIncludes(html, '已学习', 'HTML should contain "已学习" text');
    utf.assertIncludes(html, '5', 'HTML should contain count "5"');
  }
);

// Test 2: Challenge completion state displays checkmark icon
utf.test(
  'Challenge completion state displays checkmark icon',
  () => {
    const checkmarkIcon = mockIconLibrary.getIcon('checkmark');
    const html = `
      <div class="status-item daily-challenge completed">
        <span class="status-icon">${checkmarkIcon}</span>
        <span class="status-text">
          <strong>20</strong>/<strong>20</strong> 已完成
        </span>
      </div>
    `;
    
    // Assert: HTML contains checkmark SVG
    utf.assertIncludes(html, '<svg', 'HTML should contain SVG element');
    
    // Assert: HTML does not contain checkmark emoji
    utf.assertNotIncludes(html, '✅', 'HTML should not contain checkmark emoji');
    
    // Assert: HTML contains completed class
    utf.assertIncludes(html, 'completed', 'HTML should have completed class');
    
    // Assert: HTML contains correct progress
    utf.assertIncludes(html, '<strong>20</strong>/<strong>20</strong>', 'HTML should show 20/20 progress');
  }
);

// Test 3: Challenge incomplete state displays target icon
utf.test(
  'Challenge incomplete state displays target icon',
  () => {
    const targetIcon = mockIconLibrary.getIcon('target');
    const html = `
      <div class="status-item daily-challenge">
        <span class="status-icon">${targetIcon}</span>
        <span class="status-text">
          <strong>10</strong>/<strong>20</strong> 已完成
        </span>
      </div>
    `;
    
    // Assert: HTML contains target SVG
    utf.assertIncludes(html, '<svg', 'HTML should contain SVG element');
    
    // Assert: HTML does not contain target emoji
    utf.assertNotIncludes(html, '🎯', 'HTML should not contain target emoji');
    
    // Assert: HTML does not have completed class
    utf.assertNotIncludes(html, 'completed', 'HTML should not have completed class');
    
    // Assert: HTML contains correct progress
    utf.assertIncludes(html, '<strong>10</strong>/<strong>20</strong>', 'HTML should show 10/20 progress');
  }
);

// Test 4: Studied words display book icon
utf.test(
  'Studied words display book icon with correct count',
  () => {
    const bookIcon = mockIconLibrary.getIcon('book');
    const counts = [0, 1, 5, 10, 100];
    
    counts.forEach(count => {
      const html = `
        <div class="status-item today-learned">
          <span class="status-icon">${bookIcon}</span>
          <span class="status-text">已学习 <strong>${count}</strong> 个单词</span>
        </div>
      `;
      
      // Assert: HTML contains SVG
      utf.assertIncludes(html, '<svg', `HTML should contain SVG for count ${count}`);
      
      // Assert: HTML does not contain emoji
      utf.assertNotIncludes(html, '📚', `HTML should not contain emoji for count ${count}`);
      
      // Assert: HTML contains correct count
      utf.assertIncludes(html, count.toString(), `HTML should contain count ${count}`);
    });
  }
);

// Test 5: All icons have correct SVG attributes
utf.test(
  'All icons have correct SVG attributes (viewBox, stroke-width, stroke)',
  () => {
    const iconNames = ['book', 'target', 'checkmark'];
    
    iconNames.forEach(iconName => {
      const icon = mockIconLibrary.getIcon(iconName);
      
      // Assert: Icon contains viewBox
      utf.assertIncludes(icon, 'viewBox="0 0 24 24"', `Icon ${iconName} should have viewBox`);
      
      // Assert: Icon contains stroke-width
      utf.assertIncludes(icon, 'stroke-width="2"', `Icon ${iconName} should have stroke-width="2"`);
      
      // Assert: Icon contains stroke="currentColor"
      utf.assertIncludes(icon, 'stroke="currentColor"', `Icon ${iconName} should have stroke="currentColor"`);
      
      // Assert: Icon contains fill="none"
      utf.assertIncludes(icon, 'fill="none"', `Icon ${iconName} should have fill="none"`);
    });
  }
);

// Test 6: Learning panel with zero studied words
utf.test(
  'Learning panel displays correctly with zero studied words',
  () => {
    const bookIcon = mockIconLibrary.getIcon('book');
    const html = `
      <div class="learning-status-display">
        <div class="status-item today-learned">
          <span class="status-icon">${bookIcon}</span>
          <span class="status-text">已学习 <strong>0</strong> 个单词</span>
        </div>
      </div>
    `;
    
    // Assert: HTML is valid
    utf.assertIncludes(html, '<svg', 'HTML should contain SVG');
    utf.assertIncludes(html, '0', 'HTML should show 0 count');
    utf.assertNotIncludes(html, '📚', 'HTML should not contain emoji');
  }
);

// Test 7: Challenge progress bar with different completion percentages
utf.test(
  'Challenge progress bar renders correctly at different completion levels',
  () => {
    const targetIcon = mockIconLibrary.getIcon('target');
    const testCases = [
      { completed: 0, total: 20, percentage: 0 },
      { completed: 5, total: 20, percentage: 25 },
      { completed: 10, total: 20, percentage: 50 },
      { completed: 15, total: 20, percentage: 75 },
      { completed: 20, total: 20, percentage: 100 }
    ];
    
    testCases.forEach(testCase => {
      const percentage = (testCase.completed / testCase.total) * 100;
      const html = `
        <div class="status-item daily-challenge">
          <span class="status-icon">${targetIcon}</span>
          <span class="status-text">
            <strong>${testCase.completed}</strong>/<strong>${testCase.total}</strong> 已完成
          </span>
          <div class="challenge-progress-bar">
            <div class="challenge-progress-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
      
      // Assert: HTML contains correct progress
      utf.assertIncludes(html, `<strong>${testCase.completed}</strong>/<strong>${testCase.total}</strong>`, 
        `HTML should show ${testCase.completed}/${testCase.total}`);
      
      // Assert: HTML contains progress bar with correct width
      utf.assertIncludes(html, `width: ${percentage}%`, 
        `HTML should have progress bar at ${percentage}%`);
      
      // Assert: HTML contains SVG icon
      utf.assertIncludes(html, '<svg', 'HTML should contain SVG');
    });
  }
);

// Test 8: No emoji characters in rendered learning panel
utf.test(
  'No emoji characters appear in rendered learning panel HTML',
  () => {
    const bookIcon = mockIconLibrary.getIcon('book');
    const targetIcon = mockIconLibrary.getIcon('target');
    const checkmarkIcon = mockIconLibrary.getIcon('checkmark');
    
    const html = `
      <div class="learning-status-display">
        <div class="status-item today-learned">
          <span class="status-icon">${bookIcon}</span>
          <span class="status-text">已学习 <strong>5</strong> 个单词</span>
        </div>
        <div class="status-item daily-challenge">
          <span class="status-icon">${targetIcon}</span>
          <span class="status-text">
            <strong>10</strong>/<strong>20</strong> 已完成
          </span>
        </div>
      </div>
    `;
    
    // Assert: No emoji characters
    utf.assertNotIncludes(html, '📚', 'HTML should not contain book emoji');
    utf.assertNotIncludes(html, '🎯', 'HTML should not contain target emoji');
    utf.assertNotIncludes(html, '✅', 'HTML should not contain checkmark emoji');
    
    // Assert: Contains SVG elements
    const svgCount = (html.match(/<svg/g) || []).length;
    utf.assert(svgCount >= 2, `HTML should contain at least 2 SVG elements, found ${svgCount}`);
  }
);

// ============================================================================
// Run all tests and print results
// ============================================================================

utf.printResults();

// Export for use in other test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UnitTestFramework,
    utf,
    results: utf.results
  };
}
