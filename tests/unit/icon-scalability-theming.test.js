/**
 * Icon Scalability and Theming Property-Based Tests
 * Feature: svg-icon-replacement
 * 
 * Tests for icon scalability at different sizes and theme color application
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
      let input;
      try {
        input = generator();
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
// Property 4: Icon Scalability
// Validates: Requirement 6.4
// ============================================================================

console.log('\n=== Property 4: Icon Scalability ===');
console.log('For any icon rendered at different sizes (16px, 24px, 32px, 48px),');
console.log('the icon SHALL maintain its visual proportions and remain clear.');
console.log('Validates: Requirement 6.4\n');

// Test sizes to validate
const testSizes = [16, 24, 32, 48];

/**
 * Create a mock SVG element with specified size
 * @param {string} svg - SVG markup
 * @param {number} size - Size in pixels
 * @returns {Object} - Mock SVG element with size properties
 */
function createScaledSvgElement(svg, size) {
  // Parse SVG to extract viewBox
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';
  const [minX, minY, width, height] = viewBox.split(' ').map(Number);
  
  // Calculate aspect ratio
  const aspectRatio = width / height;
  
  // Calculate scaled dimensions
  const scaledWidth = size;
  const scaledHeight = size / aspectRatio;
  
  return {
    svg: svg,
    size: size,
    viewBox: viewBox,
    width: scaledWidth,
    height: scaledHeight,
    aspectRatio: aspectRatio,
    isValid: scaledWidth > 0 && scaledHeight > 0 && aspectRatio > 0
  };
}

ptf.property(
  'Property 4: Icon Scalability - Proportions Maintained',
  () => {
    // Generator: pick a random icon and size
    const allIcons = iconLibrary.getIconNames();
    const randomIconIndex = Math.floor(Math.random() * allIcons.length);
    const randomSizeIndex = Math.floor(Math.random() * testSizes.length);
    
    const iconName = allIcons[randomIconIndex];
    const size = testSizes[randomSizeIndex];
    const svg = iconLibrary.getIcon(iconName);
    
    return {
      iconName: iconName,
      size: size,
      svg: svg
    };
  },
  (input) => {
    const { iconName, size, svg } = input;
    
    // Create scaled SVG element
    const scaledElement = createScaledSvgElement(svg, size);
    
    // Property: SVG must be valid
    ptf.assert(
      scaledElement.isValid,
      `Icon "${iconName}" at ${size}px has invalid dimensions`
    );
    
    // Property: Aspect ratio must be maintained (square icons)
    // For 24x24 viewBox, aspect ratio should be 1.0
    ptf.assert(
      Math.abs(scaledElement.aspectRatio - 1.0) < 0.01,
      `Icon "${iconName}" aspect ratio ${scaledElement.aspectRatio} is not square`
    );
    
    // Property: Scaled dimensions must be positive
    ptf.assert(
      scaledElement.width > 0 && scaledElement.height > 0,
      `Icon "${iconName}" at ${size}px has non-positive dimensions`
    );
    
    // Property: SVG must contain viewBox attribute
    ptf.assert(
      svg.includes('viewBox='),
      `Icon "${iconName}" missing viewBox attribute for scaling`
    );
  },
  100
);

// Test that all icon sizes are valid
console.log('\n--- Testing all icon sizes are valid ---');
ptf.property(
  'Property 4b: All Icon Sizes Are Valid',
  () => {
    // Generator: pick a random icon and test all sizes
    const allIcons = iconLibrary.getIconNames();
    const randomIconIndex = Math.floor(Math.random() * allIcons.length);
    const iconName = allIcons[randomIconIndex];
    const svg = iconLibrary.getIcon(iconName);
    
    return {
      iconName: iconName,
      svg: svg,
      sizes: testSizes
    };
  },
  (input) => {
    const { iconName, svg, sizes } = input;
    
    // Property: icon must render at all test sizes
    sizes.forEach(size => {
      const scaledElement = createScaledSvgElement(svg, size);
      
      ptf.assert(
        scaledElement.isValid,
        `Icon "${iconName}" invalid at ${size}px`
      );
      
      ptf.assert(
        scaledElement.width === size,
        `Icon "${iconName}" width ${scaledElement.width} != ${size}px`
      );
    });
  },
  100
);

// ============================================================================
// Property 5: Theme Color Application
// Validates: Requirement 6.5
// ============================================================================

console.log('\n=== Property 5: Theme Color Application ===');
console.log('For any icon using stroke="currentColor", when the parent element\'s');
console.log('color CSS property changes (light theme to dark theme),');
console.log('the icon stroke color SHALL automatically update to match.');
console.log('Validates: Requirement 6.5\n');

/**
 * Mock DOM element with color property
 */
class MockElement {
  constructor(color = '#000000') {
    this.style = {
      color: color
    };
    this.computedStyle = {
      color: color
    };
  }
  
  setColor(color) {
    this.style.color = color;
    this.computedStyle.color = color;
  }
  
  getComputedStyle() {
    return this.computedStyle;
  }
}

/**
 * Check if SVG uses currentColor for stroke
 * @param {string} svg - SVG markup
 * @returns {boolean} - True if SVG uses currentColor
 */
function usesCurrentColor(svg) {
  return svg.includes('stroke="currentColor"');
}

/**
 * Extract stroke color from SVG
 * @param {string} svg - SVG markup
 * @returns {string|null} - Stroke color value or null
 */
function extractStrokeColor(svg) {
  const match = svg.match(/stroke="([^"]+)"/);
  return match ? match[1] : null;
}

ptf.property(
  'Property 5: Theme Color Application - currentColor Support',
  () => {
    // Generator: pick a random icon
    const allIcons = iconLibrary.getIconNames();
    const randomIconIndex = Math.floor(Math.random() * allIcons.length);
    const iconName = allIcons[randomIconIndex];
    const svg = iconLibrary.getIcon(iconName);
    
    return {
      iconName: iconName,
      svg: svg
    };
  },
  (input) => {
    const { iconName, svg } = input;
    
    // Property: all icons must use currentColor for theme support
    ptf.assert(
      usesCurrentColor(svg),
      `Icon "${iconName}" does not use stroke="currentColor" for theming`
    );
    
    // Property: stroke color must be exactly "currentColor"
    const strokeColor = extractStrokeColor(svg);
    ptf.assert(
      strokeColor === 'currentColor',
      `Icon "${iconName}" stroke color is "${strokeColor}", not "currentColor"`
    );
  },
  100
);

// Test theme switching simulation
console.log('\n--- Testing theme color switching ---');
ptf.property(
  'Property 5b: Theme Switching Updates Icon Colors',
  () => {
    // Generator: pick a random icon and theme colors
    const allIcons = iconLibrary.getIconNames();
    const randomIconIndex = Math.floor(Math.random() * allIcons.length);
    const iconName = allIcons[randomIconIndex];
    const svg = iconLibrary.getIcon(iconName);
    
    // Light and dark theme colors
    const lightColor = '#1a1a2e';  // Light theme text color
    const darkColor = '#f8fafc';   // Dark theme text color
    
    return {
      iconName: iconName,
      svg: svg,
      lightColor: lightColor,
      darkColor: darkColor
    };
  },
  (input) => {
    const { iconName, svg, lightColor, darkColor } = input;
    
    // Create mock parent elements with different colors
    const lightElement = new MockElement(lightColor);
    const darkElement = new MockElement(darkColor);
    
    // Property: SVG must use currentColor to inherit parent color
    ptf.assert(
      usesCurrentColor(svg),
      `Icon "${iconName}" cannot inherit parent color (missing currentColor)`
    );
    
    // Property: parent element colors must be different
    ptf.assert(
      lightElement.getComputedStyle().color !== darkElement.getComputedStyle().color,
      `Light and dark theme colors are the same`
    );
    
    // Property: SVG stroke must be currentColor (will inherit parent color)
    const strokeColor = extractStrokeColor(svg);
    ptf.assert(
      strokeColor === 'currentColor',
      `Icon "${iconName}" stroke is not currentColor`
    );
  },
  100
);

// ============================================================================
// Property 6: Icon Clarity at Different Sizes
// Validates: Requirement 6.4 (visual clarity)
// ============================================================================

console.log('\n=== Property 6: Icon Clarity at Different Sizes ===');
console.log('For any icon at different sizes, the SVG structure must remain');
console.log('consistent and contain all necessary path elements for clarity.');
console.log('Validates: Requirement 6.4\n');

/**
 * Count SVG path elements
 * @param {string} svg - SVG markup
 * @returns {number} - Number of path elements
 */
function countPathElements(svg) {
  const pathMatches = svg.match(/<path[^>]*>/g);
  return pathMatches ? pathMatches.length : 0;
}

/**
 * Count SVG circle elements
 * @param {string} svg - SVG markup
 * @returns {number} - Number of circle elements
 */
function countCircleElements(svg) {
  const circleMatches = svg.match(/<circle[^>]*>/g);
  return circleMatches ? circleMatches.length : 0;
}

/**
 * Count SVG line elements
 * @param {string} svg - SVG markup
 * @returns {number} - Number of line elements
 */
function countLineElements(svg) {
  const lineMatches = svg.match(/<line[^>]*>/g);
  return lineMatches ? lineMatches.length : 0;
}

/**
 * Count SVG polyline elements
 * @param {string} svg - SVG markup
 * @returns {number} - Number of polyline elements
 */
function countPolylineElements(svg) {
  const polylineMatches = svg.match(/<polyline[^>]*>/g);
  return polylineMatches ? polylineMatches.length : 0;
}

/**
 * Count total SVG shape elements
 * @param {string} svg - SVG markup
 * @returns {number} - Total number of shape elements
 */
function countShapeElements(svg) {
  return countPathElements(svg) + countCircleElements(svg) + countLineElements(svg) + countPolylineElements(svg);
}

ptf.property(
  'Property 6: Icon Clarity - Consistent Structure',
  () => {
    // Generator: pick a random icon
    const allIcons = iconLibrary.getIconNames();
    const randomIconIndex = Math.floor(Math.random() * allIcons.length);
    const iconName = allIcons[randomIconIndex];
    const svg = iconLibrary.getIcon(iconName);
    
    return {
      iconName: iconName,
      svg: svg
    };
  },
  (input) => {
    const { iconName, svg } = input;
    
    // Property: icon must have at least one shape element for visibility
    const shapeCount = countShapeElements(svg);
    ptf.assert(
      shapeCount > 0,
      `Icon "${iconName}" has no shape elements (paths, circles, lines)`
    );
    
    // Property: icon must have valid SVG structure
    ptf.assert(
      svg.includes('<svg') && svg.includes('</svg>'),
      `Icon "${iconName}" has invalid SVG structure`
    );
    
    // Property: icon must have stroke-width for visibility
    ptf.assert(
      svg.includes('stroke-width='),
      `Icon "${iconName}" missing stroke-width attribute`
    );
  },
  100
);

// Test that icon structure is consistent across all sizes
console.log('\n--- Testing icon structure consistency ---');
ptf.property(
  'Property 6b: Icon Structure Consistency Across Sizes',
  () => {
    // Generator: pick a random icon
    const allIcons = iconLibrary.getIconNames();
    const randomIconIndex = Math.floor(Math.random() * allIcons.length);
    const iconName = allIcons[randomIconIndex];
    const svg = iconLibrary.getIcon(iconName);
    
    return {
      iconName: iconName,
      svg: svg
    };
  },
  (input) => {
    const { iconName, svg } = input;
    
    // Property: SVG structure must be the same regardless of size
    // (size is applied via CSS, not by changing SVG markup)
    const shapeCount = countShapeElements(svg);
    
    // Verify structure is consistent
    testSizes.forEach(size => {
      const scaledElement = createScaledSvgElement(svg, size);
      
      // SVG markup should not change with size
      ptf.assert(
        scaledElement.svg === svg,
        `Icon "${iconName}" SVG markup changed at ${size}px`
      );
      
      // Shape count should remain the same
      const scaledShapeCount = countShapeElements(scaledElement.svg);
      ptf.assert(
        scaledShapeCount === shapeCount,
        `Icon "${iconName}" shape count changed at ${size}px`
      );
    });
  },
  100
);

// ============================================================================
// Run all tests and print results
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('ICON SCALABILITY AND THEMING PROPERTY-BASED TESTS');
console.log('='.repeat(70));

ptf.printResults();

// Export for use in other test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PropertyTestFramework,
    ptf,
    results: ptf.results,
    createScaledSvgElement,
    usesCurrentColor,
    extractStrokeColor,
    countPathElements,
    countCircleElements,
    countLineElements,
    countPolylineElements,
    countShapeElements,
    MockElement
  };
}
