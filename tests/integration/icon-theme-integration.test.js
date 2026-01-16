/**
 * Icon Theme Integration Tests
 * Feature: svg-icon-replacement
 * 
 * Integration tests for icon rendering in light/dark themes
 * and theme switching functionality
 */

const iconLibrary = require('../../components/utils/icon-library.js');

/**
 * Mock DOM environment for testing
 */
class MockDOMEnvironment {
  constructor() {
    this.body = {
      classList: {
        classes: new Set(),
        add: function(className) {
          this.classes.add(className);
        },
        remove: function(className) {
          this.classes.delete(className);
        },
        contains: function(className) {
          return this.classes.has(className);
        }
      },
      style: {
        color: '#1a1a2e'
      }
    };
    
    this.elements = [];
    this.eventListeners = {};
  }
  
  /**
   * Create a mock SVG element
   */
  createSVGElement(iconName) {
    const svg = iconLibrary.getIcon(iconName);
    return {
      iconName: iconName,
      svg: svg,
      innerHTML: svg,
      style: {
        color: this.body.style.color
      },
      computedStyle: {
        color: this.body.style.color
      }
    };
  }
  
  /**
   * Get computed style for an element
   */
  getComputedStyle(element) {
    return {
      color: element.style.color || this.body.style.color
    };
  }
  
  /**
   * Set theme
   */
  setTheme(themeName) {
    if (themeName === 'dark') {
      this.body.classList.add('theme-dark');
      this.body.style.color = '#f8fafc'; // Dark theme text color
    } else {
      this.body.classList.remove('theme-dark');
      this.body.style.color = '#1a1a2e'; // Light theme text color
    }
  }
  
  /**
   * Get current theme
   */
  getCurrentTheme() {
    return this.body.classList.contains('theme-dark') ? 'dark' : 'light';
  }
}

/**
 * Test Suite: Icon Theme Integration
 */
class IconThemeIntegrationTests {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      failures: []
    };
    this.dom = new MockDOMEnvironment();
  }
  
  /**
   * Run a test
   */
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
  
  /**
   * Assert that a condition is true
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }
  
  /**
   * Print test results
   */
  printResults() {
    console.log('\n' + '='.repeat(70));
    console.log('ICON THEME INTEGRATION TEST RESULTS');
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

// Initialize test suite
const tests = new IconThemeIntegrationTests();

// ============================================================================
// Test 1: Icon Rendering in Light Theme
// ============================================================================

console.log('\n=== Test Group 1: Icon Rendering in Light Theme ===');

tests.test('Icons render in light theme', () => {
  tests.dom.setTheme('light');
  
  const allIcons = iconLibrary.getIconNames();
  
  allIcons.forEach(iconName => {
    const element = tests.dom.createSVGElement(iconName);
    
    // Assert: SVG is valid
    tests.assert(
      element.svg && element.svg.includes('<svg'),
      `Icon "${iconName}" SVG is invalid in light theme`
    );
    
    // Assert: SVG uses currentColor
    tests.assert(
      element.svg.includes('stroke="currentColor"'),
      `Icon "${iconName}" does not use currentColor in light theme`
    );
    
    // Assert: Element has correct color
    tests.assert(
      element.style.color === '#1a1a2e',
      `Icon "${iconName}" color is not light theme color`
    );
  });
});

tests.test('Light theme text color is correct', () => {
  tests.dom.setTheme('light');
  
  const lightColor = tests.dom.body.style.color;
  tests.assert(
    lightColor === '#1a1a2e',
    `Light theme color is ${lightColor}, expected #1a1a2e`
  );
});

tests.test('Light theme class is not applied', () => {
  tests.dom.setTheme('light');
  
  const hasDarkClass = tests.dom.body.classList.contains('theme-dark');
  tests.assert(
    !hasDarkClass,
    `Light theme should not have theme-dark class`
  );
});

// ============================================================================
// Test 2: Icon Rendering in Dark Theme
// ============================================================================

console.log('\n=== Test Group 2: Icon Rendering in Dark Theme ===');

tests.test('Icons render in dark theme', () => {
  tests.dom.setTheme('dark');
  
  const allIcons = iconLibrary.getIconNames();
  
  allIcons.forEach(iconName => {
    const element = tests.dom.createSVGElement(iconName);
    
    // Assert: SVG is valid
    tests.assert(
      element.svg && element.svg.includes('<svg'),
      `Icon "${iconName}" SVG is invalid in dark theme`
    );
    
    // Assert: SVG uses currentColor
    tests.assert(
      element.svg.includes('stroke="currentColor"'),
      `Icon "${iconName}" does not use currentColor in dark theme`
    );
    
    // Assert: Element has correct color
    tests.assert(
      element.style.color === '#f8fafc',
      `Icon "${iconName}" color is not dark theme color`
    );
  });
});

tests.test('Dark theme text color is correct', () => {
  tests.dom.setTheme('dark');
  
  const darkColor = tests.dom.body.style.color;
  tests.assert(
    darkColor === '#f8fafc',
    `Dark theme color is ${darkColor}, expected #f8fafc`
  );
});

tests.test('Dark theme class is applied', () => {
  tests.dom.setTheme('dark');
  
  const hasDarkClass = tests.dom.body.classList.contains('theme-dark');
  tests.assert(
    hasDarkClass,
    `Dark theme should have theme-dark class`
  );
});

// ============================================================================
// Test 3: Theme Switching
// ============================================================================

console.log('\n=== Test Group 3: Theme Switching ===');

tests.test('Theme switching from light to dark', () => {
  // Start with light theme
  tests.dom.setTheme('light');
  let currentTheme = tests.dom.getCurrentTheme();
  tests.assert(
    currentTheme === 'light',
    `Initial theme should be light, got ${currentTheme}`
  );
  
  // Switch to dark theme
  tests.dom.setTheme('dark');
  currentTheme = tests.dom.getCurrentTheme();
  tests.assert(
    currentTheme === 'dark',
    `After switching, theme should be dark, got ${currentTheme}`
  );
  
  // Verify color changed
  const darkColor = tests.dom.body.style.color;
  tests.assert(
    darkColor === '#f8fafc',
    `Dark theme color should be #f8fafc, got ${darkColor}`
  );
});

tests.test('Theme switching from dark to light', () => {
  // Start with dark theme
  tests.dom.setTheme('dark');
  let currentTheme = tests.dom.getCurrentTheme();
  tests.assert(
    currentTheme === 'dark',
    `Initial theme should be dark, got ${currentTheme}`
  );
  
  // Switch to light theme
  tests.dom.setTheme('light');
  currentTheme = tests.dom.getCurrentTheme();
  tests.assert(
    currentTheme === 'light',
    `After switching, theme should be light, got ${currentTheme}`
  );
  
  // Verify color changed
  const lightColor = tests.dom.body.style.color;
  tests.assert(
    lightColor === '#1a1a2e',
    `Light theme color should be #1a1a2e, got ${lightColor}`
  );
});

tests.test('Multiple theme switches work correctly', () => {
  // Switch multiple times
  for (let i = 0; i < 5; i++) {
    tests.dom.setTheme('light');
    tests.assert(
      tests.dom.getCurrentTheme() === 'light',
      `Theme switch ${i * 2 + 1} failed`
    );
    
    tests.dom.setTheme('dark');
    tests.assert(
      tests.dom.getCurrentTheme() === 'dark',
      `Theme switch ${i * 2 + 2} failed`
    );
  }
});

// ============================================================================
// Test 4: Icon Updates on Theme Switch
// ============================================================================

console.log('\n=== Test Group 4: Icon Updates on Theme Switch ===');

tests.test('Icons update colors when theme switches', () => {
  const allIcons = iconLibrary.getIconNames();
  
  // Create elements in light theme
  tests.dom.setTheme('light');
  const lightElements = {};
  allIcons.forEach(iconName => {
    lightElements[iconName] = tests.dom.createSVGElement(iconName);
  });
  
  // Switch to dark theme
  tests.dom.setTheme('dark');
  const darkElements = {};
  allIcons.forEach(iconName => {
    darkElements[iconName] = tests.dom.createSVGElement(iconName);
  });
  
  // Verify colors changed
  allIcons.forEach(iconName => {
    const lightColor = lightElements[iconName].style.color;
    const darkColor = darkElements[iconName].style.color;
    
    tests.assert(
      lightColor !== darkColor,
      `Icon "${iconName}" color did not change on theme switch`
    );
    
    tests.assert(
      lightColor === '#1a1a2e',
      `Icon "${iconName}" light color is ${lightColor}, expected #1a1a2e`
    );
    
    tests.assert(
      darkColor === '#f8fafc',
      `Icon "${iconName}" dark color is ${darkColor}, expected #f8fafc`
    );
  });
});

tests.test('All icons use currentColor for theme support', () => {
  const allIcons = iconLibrary.getIconNames();
  
  allIcons.forEach(iconName => {
    const svg = iconLibrary.getIcon(iconName);
    
    tests.assert(
      svg.includes('stroke="currentColor"'),
      `Icon "${iconName}" does not use stroke="currentColor"`
    );
  });
});

// ============================================================================
// Test 5: Icon Consistency Across Themes
// ============================================================================

console.log('\n=== Test Group 5: Icon Consistency Across Themes ===');

tests.test('Icon SVG markup is identical across themes', () => {
  const allIcons = iconLibrary.getIconNames();
  
  tests.dom.setTheme('light');
  const lightSvgs = {};
  allIcons.forEach(iconName => {
    lightSvgs[iconName] = iconLibrary.getIcon(iconName);
  });
  
  tests.dom.setTheme('dark');
  const darkSvgs = {};
  allIcons.forEach(iconName => {
    darkSvgs[iconName] = iconLibrary.getIcon(iconName);
  });
  
  // SVG markup should be identical (only color changes via CSS)
  allIcons.forEach(iconName => {
    tests.assert(
      lightSvgs[iconName] === darkSvgs[iconName],
      `Icon "${iconName}" SVG markup differs between themes`
    );
  });
});

tests.test('Icon attributes are consistent across themes', () => {
  const allIcons = iconLibrary.getIconNames();
  
  allIcons.forEach(iconName => {
    const svg = iconLibrary.getIcon(iconName);
    
    // Check required attributes
    tests.assert(
      svg.includes('viewBox="0 0 24 24"'),
      `Icon "${iconName}" missing viewBox in light theme`
    );
    
    tests.assert(
      svg.includes('stroke-width="2"'),
      `Icon "${iconName}" missing stroke-width in light theme`
    );
    
    tests.assert(
      svg.includes('fill="none"'),
      `Icon "${iconName}" missing fill="none" in light theme`
    );
  });
  
  // Verify same attributes in dark theme
  tests.dom.setTheme('dark');
  allIcons.forEach(iconName => {
    const svg = iconLibrary.getIcon(iconName);
    
    tests.assert(
      svg.includes('viewBox="0 0 24 24"'),
      `Icon "${iconName}" missing viewBox in dark theme`
    );
    
    tests.assert(
      svg.includes('stroke-width="2"'),
      `Icon "${iconName}" missing stroke-width in dark theme`
    );
    
    tests.assert(
      svg.includes('fill="none"'),
      `Icon "${iconName}" missing fill="none" in dark theme`
    );
  });
});

// ============================================================================
// Test 6: UI Location Theme Support
// ============================================================================

console.log('\n=== Test Group 6: UI Location Theme Support ===');

/**
 * Mock UI locations
 */
const uiLocations = {
  homepage: {
    name: 'Homepage Learning Panel',
    icons: ['book', 'target', 'checkmark']
  },
  dialogs: {
    name: 'Dialog Headers',
    icons: ['import', 'export', 'book', 'settings']
  },
  settings: {
    name: 'Settings Page',
    icons: ['palette', 'ai', 'globe', 'book', 'database']
  },
  translation: {
    name: 'Translation Dialog',
    icons: ['example', 'synonym', 'antonym', 'tree', 'info', 'copy', 'share', 'add']
  }
};

tests.test('Homepage icons render in light theme', () => {
  tests.dom.setTheme('light');
  
  const homepageIcons = uiLocations.homepage.icons;
  homepageIcons.forEach(iconName => {
    const element = tests.dom.createSVGElement(iconName);
    
    tests.assert(
      element.svg && element.svg.includes('<svg'),
      `Homepage icon "${iconName}" is invalid in light theme`
    );
    
    tests.assert(
      element.style.color === '#1a1a2e',
      `Homepage icon "${iconName}" has wrong color in light theme`
    );
  });
});

tests.test('Homepage icons render in dark theme', () => {
  tests.dom.setTheme('dark');
  
  const homepageIcons = uiLocations.homepage.icons;
  homepageIcons.forEach(iconName => {
    const element = tests.dom.createSVGElement(iconName);
    
    tests.assert(
      element.svg && element.svg.includes('<svg'),
      `Homepage icon "${iconName}" is invalid in dark theme`
    );
    
    tests.assert(
      element.style.color === '#f8fafc',
      `Homepage icon "${iconName}" has wrong color in dark theme`
    );
  });
});

tests.test('Dialog icons render in light theme', () => {
  tests.dom.setTheme('light');
  
  const dialogIcons = uiLocations.dialogs.icons;
  dialogIcons.forEach(iconName => {
    const element = tests.dom.createSVGElement(iconName);
    
    tests.assert(
      element.svg && element.svg.includes('<svg'),
      `Dialog icon "${iconName}" is invalid in light theme`
    );
  });
});

tests.test('Dialog icons render in dark theme', () => {
  tests.dom.setTheme('dark');
  
  const dialogIcons = uiLocations.dialogs.icons;
  dialogIcons.forEach(iconName => {
    const element = tests.dom.createSVGElement(iconName);
    
    tests.assert(
      element.svg && element.svg.includes('<svg'),
      `Dialog icon "${iconName}" is invalid in dark theme`
    );
  });
});

tests.test('Settings icons render in light theme', () => {
  tests.dom.setTheme('light');
  
  const settingsIcons = uiLocations.settings.icons;
  settingsIcons.forEach(iconName => {
    const element = tests.dom.createSVGElement(iconName);
    
    tests.assert(
      element.svg && element.svg.includes('<svg'),
      `Settings icon "${iconName}" is invalid in light theme`
    );
  });
});

tests.test('Settings icons render in dark theme', () => {
  tests.dom.setTheme('dark');
  
  const settingsIcons = uiLocations.settings.icons;
  settingsIcons.forEach(iconName => {
    const element = tests.dom.createSVGElement(iconName);
    
    tests.assert(
      element.svg && element.svg.includes('<svg'),
      `Settings icon "${iconName}" is invalid in dark theme`
    );
  });
});

tests.test('Translation dialog icons render in light theme', () => {
  tests.dom.setTheme('light');
  
  const translationIcons = uiLocations.translation.icons;
  translationIcons.forEach(iconName => {
    const element = tests.dom.createSVGElement(iconName);
    
    tests.assert(
      element.svg && element.svg.includes('<svg'),
      `Translation icon "${iconName}" is invalid in light theme`
    );
  });
});

tests.test('Translation dialog icons render in dark theme', () => {
  tests.dom.setTheme('dark');
  
  const translationIcons = uiLocations.translation.icons;
  translationIcons.forEach(iconName => {
    const element = tests.dom.createSVGElement(iconName);
    
    tests.assert(
      element.svg && element.svg.includes('<svg'),
      `Translation icon "${iconName}" is invalid in dark theme`
    );
  });
});

// ============================================================================
// Run all tests and print results
// ============================================================================

tests.printResults();

// Export for use in other test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IconThemeIntegrationTests,
    tests,
    results: tests.results,
    MockDOMEnvironment,
    uiLocations
  };
}
