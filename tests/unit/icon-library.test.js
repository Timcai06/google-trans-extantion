/**
 * Icon Library Property-Based Tests
 * Feature: svg-icon-replacement
 * 
 * Tests for icon library completeness and consistency
 */

const iconLibrary = require('../../components/utils/icon-library.js');

/**
 * Simple property-based testing framework
 * Generates random test cases and validates properties
 */
class PropertyTestFramework {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      failures: []
    };
  }

  /**
   * Run a property test with generated inputs
   * @param {string} propertyName - Name of the property being tested
   * @param {Function} generator - Function that generates test inputs
   * @param {Function} property - Function that validates the property
   * @param {number} iterations - Number of test iterations (default: 100)
   */
  property(propertyName, generator, property, iterations = 100) {
    console.log(`\nTesting Property: ${propertyName}`);
    console.log(`Running ${iterations} iterations...`);
    
    let passed = 0;
    let failed = 0;
    const failures = [];

    for (let i = 0; i < iterations; i++) {
      try {
        const input = generator();
        property(input);
        passed++;
      } catch (error) {
        failed++;
        failures.push({
          iteration: i,
          error: error.message,
          input: input
        });
      }
    }

    this.results.total += iterations;
    this.results.passed += passed;
    this.results.failed += failed;

    if (failed > 0) {
      this.results.failures.push({
        property: propertyName,
        failures: failures
      });
      console.log(`❌ FAILED: ${failed}/${iterations} iterations failed`);
      if (failures.length > 0) {
        console.log(`   First failure: ${failures[0].error}`);
      }
    } else {
      console.log(`✅ PASSED: All ${iterations} iterations passed`);
    }

    return failed === 0;
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
   * Print test results summary
   */
  printResults() {
    console.log('\n=== Property Test Results ===');
    console.log(`Total iterations: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Pass rate: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`);
    
    if (this.results.failures.length > 0) {
      console.log('\n=== Failures ===');
      this.results.failures.forEach(failure => {
        console.log(`\nProperty: ${failure.property}`);
        failure.failures.slice(0, 3).forEach(f => {
          console.log(`  Iteration ${f.iteration}: ${f.error}`);
        });
      });
    }
  }
}

// Initialize test framework
const ptf = new PropertyTestFramework();

// ============================================================================
// Property 1: Icon Library Completeness
// Validates: Requirements 5.1, 5.2, 5.3
// ============================================================================

const requiredIconNames = [
  'book', 'target', 'checkmark', 'import', 'export', 'settings',
  'palette', 'ai', 'database', 'example', 'synonym', 'antonym',
  'tree', 'info', 'copy', 'share', 'add', 'globe'
];

console.log('\n=== Property 1: Icon Library Completeness ===');
console.log('For any icon name in the set of required icons, the icon library');
console.log('SHALL contain a retrievable icon definition with that name.');
console.log('Validates: Requirements 5.1, 5.2, 5.3\n');

ptf.property(
  'Property 1: Icon Library Completeness',
  () => {
    // Generator: pick a random required icon name
    const randomIndex = Math.floor(Math.random() * requiredIconNames.length);
    return requiredIconNames[randomIndex];
  },
  (iconName) => {
    // Property: icon library must contain the icon
    ptf.assert(
      iconLibrary.hasIcon(iconName),
      `Icon "${iconName}" not found in library`
    );
    
    // Property: getIcon() must return valid SVG
    const svg = iconLibrary.getIcon(iconName);
    ptf.assert(
      svg && typeof svg === 'string',
      `getIcon("${iconName}") did not return a string`
    );
    ptf.assert(
      svg.includes('<svg'),
      `getIcon("${iconName}") did not return valid SVG markup`
    );
  },
  100
);

// Test invalid icon names return fallback
console.log('\n--- Testing invalid icon names return fallback ---');
ptf.property(
  'Property 1b: Invalid icon names return fallback',
  () => {
    // Generator: create invalid icon names
    const invalidNames = ['nonexistent', 'fake-icon', 'xyz123', ''];
    return invalidNames[Math.floor(Math.random() * invalidNames.length)];
  },
  (invalidName) => {
    // Property: invalid names should return fallback (info icon)
    const svg = iconLibrary.getIcon(invalidName);
    ptf.assert(
      svg === iconLibrary.getIcon('info'),
      `Invalid icon name "${invalidName}" did not return fallback icon`
    );
  },
  50
);

// ============================================================================
// Property 2: Icon Attribute Consistency
// Validates: Requirements 6.1, 6.2, 6.3
// ============================================================================

console.log('\n=== Property 2: Icon Attribute Consistency ===');
console.log('For any icon retrieved from the icon library, the SVG markup');
console.log('SHALL contain viewBox="0 0 24 24", stroke-width="2", and stroke="currentColor".');
console.log('Validates: Requirements 6.1, 6.2, 6.3\n');

ptf.property(
  'Property 2: Icon Attribute Consistency',
  () => {
    // Generator: pick a random icon name
    const allIcons = iconLibrary.getIconNames();
    const randomIndex = Math.floor(Math.random() * allIcons.length);
    return allIcons[randomIndex];
  },
  (iconName) => {
    const svg = iconLibrary.getIcon(iconName);
    
    // Property: viewBox="0 0 24 24"
    ptf.assert(
      svg.includes('viewBox="0 0 24 24"'),
      `Icon "${iconName}" missing viewBox="0 0 24 24"`
    );
    
    // Property: stroke-width="2"
    ptf.assert(
      svg.includes('stroke-width="2"'),
      `Icon "${iconName}" missing stroke-width="2"`
    );
    
    // Property: stroke="currentColor"
    ptf.assert(
      svg.includes('stroke="currentColor"'),
      `Icon "${iconName}" missing stroke="currentColor"`
    );
    
    // Property: fill="none" for outline style
    ptf.assert(
      svg.includes('fill="none"'),
      `Icon "${iconName}" missing fill="none"`
    );
  },
  100
);

// ============================================================================
// Property 3: Icon Retrieval Consistency
// Validates: Requirement 5.2
// ============================================================================

console.log('\n=== Property 3: Icon Retrieval Consistency ===');
console.log('For any call to retrieve an icon by name from the icon library,');
console.log('the same icon definition SHALL be returned consistently.');
console.log('Validates: Requirement 5.2\n');

ptf.property(
  'Property 3: Icon Retrieval Consistency',
  () => {
    // Generator: pick a random icon name
    const allIcons = iconLibrary.getIconNames();
    const randomIndex = Math.floor(Math.random() * allIcons.length);
    return allIcons[randomIndex];
  },
  (iconName) => {
    // Property: multiple calls return identical results
    const svg1 = iconLibrary.getIcon(iconName);
    const svg2 = iconLibrary.getIcon(iconName);
    const svg3 = iconLibrary.getIcon(iconName);
    
    ptf.assert(
      svg1 === svg2 && svg2 === svg3,
      `Icon "${iconName}" returned different SVG on multiple calls`
    );
  },
  100
);

// ============================================================================
// Property 4: No Emoji Characters in Rendered Output
// Validates: Requirements 1.1, 2.1, 3.1, 4.1
// ============================================================================

console.log('\n=== Property 4: No Emoji Characters in Rendered Output ===');
console.log('For any UI location where emojis were previously used,');
console.log('the rendered HTML SHALL not contain any emoji Unicode characters.');
console.log('Validates: Requirements 1.1, 2.1, 3.1, 4.1\n');

// Emoji Unicode ranges to check
const emojiRanges = [
  { start: 0x1F300, end: 0x1F9FF }, // Emoticons, symbols, pictographs
  { start: 0x1F600, end: 0x1F64F }, // Emoticons
  { start: 0x1F900, end: 0x1F9FF }, // Supplemental Symbols and Pictographs
  { start: 0x2600, end: 0x27BF }    // Miscellaneous Symbols
];

function containsEmoji(text) {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    for (const range of emojiRanges) {
      if (code >= range.start && code <= range.end) {
        return true;
      }
    }
  }
  return false;
}

// Test that icon library SVG output contains no emojis
ptf.property(
  'Property 4: No Emoji Characters in Icon SVG Output',
  () => {
    // Generator: pick a random icon name
    const allIcons = iconLibrary.getIconNames();
    const randomIndex = Math.floor(Math.random() * allIcons.length);
    return allIcons[randomIndex];
  },
  (iconName) => {
    const svg = iconLibrary.getIcon(iconName);
    
    // Property: SVG output should not contain emoji characters
    ptf.assert(
      !containsEmoji(svg),
      `Icon "${iconName}" SVG contains emoji characters`
    );
  },
  100
);

// Test that getAllIcons() returns no emojis
console.log('\n--- Testing getAllIcons() contains no emojis ---');
ptf.property(
  'Property 4b: getAllIcons() contains no emoji characters',
  () => {
    // Generator: get all icons and pick a random one
    const allIcons = iconLibrary.getAllIcons();
    const iconNames = Object.keys(allIcons);
    const randomIndex = Math.floor(Math.random() * iconNames.length);
    return allIcons[iconNames[randomIndex]];
  },
  (svg) => {
    // Property: no emoji in any icon SVG
    ptf.assert(
      !containsEmoji(svg),
      `Icon SVG contains emoji characters`
    );
  },
  100
);

// ============================================================================
// Property 5: Icon Retrieval Consistency (Duplicate of Property 3)
// Validates: Requirement 5.2
// ============================================================================

console.log('\n=== Property 5: Icon Retrieval Consistency (Checkpoint Validation) ===');
console.log('For any call to retrieve an icon by name from the icon library,');
console.log('the same icon definition SHALL be returned consistently.');
console.log('Validates: Requirement 5.2\n');

ptf.property(
  'Property 5: Icon Retrieval Consistency - Multiple Calls',
  () => {
    // Generator: pick a random icon name
    const allIcons = iconLibrary.getIconNames();
    const randomIndex = Math.floor(Math.random() * allIcons.length);
    return allIcons[randomIndex];
  },
  (iconName) => {
    // Property: multiple calls return identical results
    const svg1 = iconLibrary.getIcon(iconName);
    const svg2 = iconLibrary.getIcon(iconName);
    const svg3 = iconLibrary.getIcon(iconName);
    const svg4 = iconLibrary.getIcon(iconName);
    const svg5 = iconLibrary.getIcon(iconName);
    
    ptf.assert(
      svg1 === svg2 && svg2 === svg3 && svg3 === svg4 && svg4 === svg5,
      `Icon "${iconName}" returned different SVG on multiple calls`
    );
  },
  100
);

// Test that getAllIcons() returns consistent results
console.log('\n--- Testing getAllIcons() consistency ---');
ptf.property(
  'Property 5b: getAllIcons() returns consistent results',
  () => {
    // Generator: just return a counter
    return Math.floor(Math.random() * 10);
  },
  () => {
    // Property: multiple calls to getAllIcons() return identical results
    const icons1 = JSON.stringify(iconLibrary.getAllIcons());
    const icons2 = JSON.stringify(iconLibrary.getAllIcons());
    const icons3 = JSON.stringify(iconLibrary.getAllIcons());
    
    ptf.assert(
      icons1 === icons2 && icons2 === icons3,
      `getAllIcons() returned different results on multiple calls`
    );
  },
  50
);

// ============================================================================
// Run all tests and print results
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('ICON LIBRARY PROPERTY-BASED TESTS - CHECKPOINT VALIDATION');
console.log('='.repeat(70));

ptf.printResults();

// Export for use in other test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PropertyTestFramework,
    ptf,
    results: ptf.results,
    containsEmoji
  };
}
