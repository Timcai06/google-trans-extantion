/**
 * Dialog Headers Unit Tests
 * Feature: svg-icon-replacement
 * 
 * Tests for dialog header icon replacement and emoji removal
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

const TestFramework = require('./test-framework.js');
const iconLibrary = require('../../components/utils/icon-library.js');

const tf = new TestFramework();

// ============================================================================
// Test Suite: Dialog Headers
// ============================================================================

const dialogHeaderTests = tf.suite('Dialog Headers');

/**
 * Helper function to check if text contains emoji
 * @param {string} text - Text to check
 * @returns {boolean} - True if text contains emoji
 */
function containsEmoji(text) {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
  return emojiRegex.test(text);
}

/**
 * Helper function to check if SVG has correct attributes
 * @param {string} svg - SVG markup
 * @returns {Object} - Object with attribute checks
 */
function checkSVGAttributes(svg) {
  return {
    hasViewBox: svg.includes('viewBox="0 0 24 24"'),
    hasStrokeWidth: svg.includes('stroke-width="2"'),
    hasStroke: svg.includes('stroke="currentColor"'),
    hasFill: svg.includes('fill="none"')
  };
}

// ============================================================================
// Test 1: Import Dialog displays import icon
// Requirement: 2.1
// ============================================================================

dialogHeaderTests.test('Import dialog displays import icon', () => {
  const svg = iconLibrary.getIcon('import');
  
  // Assert: SVG should be available
  tf.assert(
    svg && typeof svg === 'string',
    'Import icon should be retrievable from library'
  );
  
  // Assert: SVG should contain valid markup
  tf.assert(
    svg.includes('<svg'),
    'Import icon should contain valid SVG markup'
  );
  
  // Assert: SVG should not contain emoji
  tf.assert(
    !containsEmoji(svg),
    'Import icon SVG should not contain emoji characters'
  );
  
  // Assert: SVG should have correct attributes
  const attrs = checkSVGAttributes(svg);
  tf.assert(attrs.hasViewBox, 'Import icon should have viewBox="0 0 24 24"');
  tf.assert(attrs.hasStrokeWidth, 'Import icon should have stroke-width="2"');
  tf.assert(attrs.hasStroke, 'Import icon should have stroke="currentColor"');
});

// ============================================================================
// Test 2: Export Dialog displays export icon
// Requirement: 2.2
// ============================================================================

dialogHeaderTests.test('Export dialog displays export icon', () => {
  const svg = iconLibrary.getIcon('export');
  
  // Assert: SVG should be available
  tf.assert(
    svg && typeof svg === 'string',
    'Export icon should be retrievable from library'
  );
  
  // Assert: SVG should contain valid markup
  tf.assert(
    svg.includes('<svg'),
    'Export icon should contain valid SVG markup'
  );
  
  // Assert: SVG should not contain emoji
  tf.assert(
    !containsEmoji(svg),
    'Export icon SVG should not contain emoji characters'
  );
  
  // Assert: SVG should have correct attributes
  const attrs = checkSVGAttributes(svg);
  tf.assert(attrs.hasViewBox, 'Export icon should have viewBox="0 0 24 24"');
  tf.assert(attrs.hasStrokeWidth, 'Export icon should have stroke-width="2"');
  tf.assert(attrs.hasStroke, 'Export icon should have stroke="currentColor"');
});

// ============================================================================
// Test 3: Translation Dialog displays book icon
// Requirement: 2.3
// ============================================================================

dialogHeaderTests.test('Translation dialog displays book icon', () => {
  const svg = iconLibrary.getIcon('book');
  
  // Assert: SVG should be available
  tf.assert(
    svg && typeof svg === 'string',
    'Book icon should be retrievable from library'
  );
  
  // Assert: SVG should contain valid markup
  tf.assert(
    svg.includes('<svg'),
    'Book icon should contain valid SVG markup'
  );
  
  // Assert: SVG should not contain emoji
  tf.assert(
    !containsEmoji(svg),
    'Book icon SVG should not contain emoji characters'
  );
  
  // Assert: SVG should have correct attributes
  const attrs = checkSVGAttributes(svg);
  tf.assert(attrs.hasViewBox, 'Book icon should have viewBox="0 0 24 24"');
  tf.assert(attrs.hasStrokeWidth, 'Book icon should have stroke-width="2"');
  tf.assert(attrs.hasStroke, 'Book icon should have stroke="currentColor"');
});

// ============================================================================
// Test 4: Settings Dialog displays settings icon
// Requirement: 2.4
// ============================================================================

dialogHeaderTests.test('Settings dialog displays settings icon', () => {
  const svg = iconLibrary.getIcon('settings');
  
  // Assert: SVG should be available
  tf.assert(
    svg && typeof svg === 'string',
    'Settings icon should be retrievable from library'
  );
  
  // Assert: SVG should contain valid markup
  tf.assert(
    svg.includes('<svg'),
    'Settings icon should contain valid SVG markup'
  );
  
  // Assert: SVG should not contain emoji
  tf.assert(
    !containsEmoji(svg),
    'Settings icon SVG should not contain emoji characters'
  );
  
  // Assert: SVG should have correct attributes
  const attrs = checkSVGAttributes(svg);
  tf.assert(attrs.hasViewBox, 'Settings icon should have viewBox="0 0 24 24"');
  tf.assert(attrs.hasStrokeWidth, 'Settings icon should have stroke-width="2"');
  tf.assert(attrs.hasStroke, 'Settings icon should have stroke="currentColor"');
});

// ============================================================================
// Test 5: All dialog icons have consistent styling
// Requirement: 2.5
// ============================================================================

dialogHeaderTests.test('All dialog icons have consistent styling', () => {
  const iconNames = ['import', 'export', 'book', 'settings'];
  
  iconNames.forEach(iconName => {
    const svg = iconLibrary.getIcon(iconName);
    const attrs = checkSVGAttributes(svg);
    
    // All icons should have same viewBox
    tf.assert(
      attrs.hasViewBox,
      `${iconName} icon should have viewBox="0 0 24 24"`
    );
    
    // All icons should have same stroke-width
    tf.assert(
      attrs.hasStrokeWidth,
      `${iconName} icon should have stroke-width="2"`
    );
    
    // All icons should have same stroke color
    tf.assert(
      attrs.hasStroke,
      `${iconName} icon should have stroke="currentColor"`
    );
    
    // All icons should have fill="none"
    tf.assert(
      attrs.hasFill,
      `${iconName} icon should have fill="none"`
    );
  });
});

// ============================================================================
// Test 6: Dialog header content does not contain emoji
// Requirement: 2.1, 2.2, 2.3, 2.4
// ============================================================================

dialogHeaderTests.test('Dialog header content does not contain emoji', () => {
  const dialogIcons = [
    { name: 'import', emoji: '📥' },
    { name: 'export', emoji: '📤' },
    { name: 'book', emoji: '📚' },
    { name: 'settings', emoji: '⚙️' }
  ];
  
  dialogIcons.forEach(({ name, emoji }) => {
    // Verify that the emoji is not in the SVG
    const svg = iconLibrary.getIcon(name);
    tf.assert(
      !svg.includes(emoji),
      `${name} icon should not contain emoji "${emoji}"`
    );
  });
});

// ============================================================================
// Test 7: Dialog icons are retrievable from icon library
// Requirement: 2.1, 2.2, 2.3, 2.4
// ============================================================================

dialogHeaderTests.test('Dialog icons are retrievable from icon library', () => {
  const iconNames = ['import', 'export', 'book', 'settings'];
  
  iconNames.forEach(iconName => {
    const svg = iconLibrary.getIcon(iconName);
    
    tf.assert(
      svg && typeof svg === 'string',
      `Icon "${iconName}" should be retrievable from library`
    );
    
    tf.assert(
      svg.includes('<svg'),
      `Icon "${iconName}" should contain valid SVG markup`
    );
  });
});

// ============================================================================
// Test 8: Dialog icons have proper SVG structure
// Requirement: 2.1, 2.2, 2.3, 2.4
// ============================================================================

dialogHeaderTests.test('Dialog icons have proper SVG structure', () => {
  const iconNames = ['import', 'export', 'book', 'settings'];
  
  iconNames.forEach(iconName => {
    const svg = iconLibrary.getIcon(iconName);
    
    // SVG should have opening and closing tags
    tf.assert(
      svg.includes('<svg') && svg.includes('</svg>'),
      `${iconName} icon should have proper SVG structure`
    );
    
    // SVG should have path or other shape elements
    tf.assert(
      svg.includes('<path') || svg.includes('<circle') || svg.includes('<rect') || svg.includes('<line') || svg.includes('<polyline'),
      `${iconName} icon should contain shape elements`
    );
  });
});

// ============================================================================
// Run all tests
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('DIALOG HEADERS UNIT TESTS');
console.log('='.repeat(70));

tf.run().then(results => {
  if (results.failed === 0) {
    console.log('\n✅ All dialog header tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
});

// Export for use in other test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TestFramework: tf,
    results: tf.results
  };
}
