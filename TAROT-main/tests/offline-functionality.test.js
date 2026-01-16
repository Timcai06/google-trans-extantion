/**
 * Offline Functionality Tests - Task 8.3
 * Feature: csp-compliance-fix, Property 6: 离线可用性
 * Validates: Requirements 2.6
 * 
 * This test verifies that all functionality works in offline mode
 * (no external network requests required).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, message = '') {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status}: ${name}`);
    if (message) {
        console.log(`    ${message}`);
    }
    testResults.tests.push({ name, passed, message });
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
}

function logSection(title) {
    console.log(`\n${title}`);
    console.log('='.repeat(title.length));
}

// Test 1: Verify all dependencies are bundled locally
function testLocalDependencies() {
    logSection('Test 1: Local Dependencies Verification');
    
    const indexJs = path.join(projectRoot, 'dist', 'assets', 'index.js');
    
    if (!fs.existsSync(indexJs)) {
        logTest('Bundle file exists', false, 'index.js not found');
        return;
    }

    const bundleContent = fs.readFileSync(indexJs, 'utf-8');
    
    // Check that all required dependencies are in the bundle
    const requiredDependencies = [
        { name: 'React', pattern: /react/ },
        { name: 'React DOM', pattern: /react-dom/ },
        { name: 'Framer Motion', pattern: /framer-motion|motion/ },
        { name: 'Lucide React', pattern: /lucide-react|lucide/ }
    ];

    requiredDependencies.forEach(dep => {
        const found = dep.pattern.test(bundleContent);
        logTest(
            `${dep.name} bundled locally`,
            found,
            found ? 'Found in bundle' : 'Not found in bundle'
        );
    });
}

// Test 2: Verify no external API calls in bundle
function testNoExternalApiCalls() {
    logSection('Test 2: External API Call Prevention');
    
    const indexJs = path.join(projectRoot, 'dist', 'assets', 'index.js');
    
    if (!fs.existsSync(indexJs)) {
        logTest('Bundle file exists', false, 'index.js not found');
        return;
    }

    const bundleContent = fs.readFileSync(indexJs, 'utf-8');
    
    // Check for external API patterns
    const externalApiPatterns = [
        { name: 'esm.sh CDN', pattern: /esm\.sh/gi },
        { name: 'cdn.tailwindcss.com', pattern: /cdn\.tailwindcss\.com/gi },
        { name: 'googleapis.com', pattern: /googleapis\.com/gi },
        { name: 'fonts.googleapis.com', pattern: /fonts\.googleapis\.com/gi },
        { name: 'unpkg.com', pattern: /unpkg\.com/gi },
        { name: 'jsdelivr.net', pattern: /jsdelivr\.net/gi }
    ];

    externalApiPatterns.forEach(pattern => {
        const matches = (bundleContent.match(pattern.pattern) || []).length;
        logTest(
            `No ${pattern.name} references`,
            matches === 0,
            matches > 0 ? `Found ${matches} references` : 'Clean'
        );
    });
}

// Test 3: Verify CSS is self-contained
function testSelfContainedCss() {
    logSection('Test 3: Self-Contained CSS Verification');
    
    const styleCss = path.join(projectRoot, 'dist', 'assets', 'style.css');
    
    if (!fs.existsSync(styleCss)) {
        logTest('CSS file exists', false, 'style.css not found');
        return;
    }

    const cssContent = fs.readFileSync(styleCss, 'utf-8');
    
    // Check for external font references
    const externalFontPatterns = [
        { name: 'Google Fonts', pattern: /fonts\.googleapis\.com/gi },
        { name: 'Font Awesome CDN', pattern: /fontawesome\.com/gi }
    ];

    externalFontPatterns.forEach(pattern => {
        const matches = (cssContent.match(pattern.pattern) || []).length;
        logTest(
            `No ${pattern.name}`,
            matches === 0,
            matches > 0 ? `Found ${matches} references` : 'Clean'
        );
    });

    // Check that CSS has all necessary styles
    logTest(
        'CSS contains Tailwind utilities',
        /\.flex|\.grid|\.p-|\.m-|\.text-/.test(cssContent),
        'Tailwind utilities found'
    );

    logTest(
        'CSS contains custom animations',
        /@keyframes|animation\s*:/.test(cssContent),
        'Animations found'
    );
}

// Test 4: Verify HTML is self-contained
function testSelfContainedHtml() {
    logSection('Test 4: Self-Contained HTML Verification');
    
    const indexHtml = path.join(projectRoot, 'dist', 'index.html');
    
    if (!fs.existsSync(indexHtml)) {
        logTest('HTML file exists', false, 'index.html not found');
        return;
    }

    const htmlContent = fs.readFileSync(indexHtml, 'utf-8');
    
    // Check for external resources
    const externalResourcePatterns = [
        { name: 'External scripts', pattern: /src\s*=\s*["']https?:\/\/[^"']*["']/gi },
        { name: 'External stylesheets', pattern: /href\s*=\s*["']https?:\/\/[^"']*\.css["']/gi },
        { name: 'External fonts', pattern: /fonts\.googleapis\.com/gi },
        { name: 'CDN references', pattern: /cdn\./gi }
    ];

    externalResourcePatterns.forEach(pattern => {
        const matches = (htmlContent.match(pattern.pattern) || []).length;
        logTest(
            `No ${pattern.name}`,
            matches === 0,
            matches > 0 ? `Found ${matches} references` : 'Clean'
        );
    });

    // Check that HTML references local assets
    logTest(
        'HTML references local CSS',
        /href\s*=\s*["'].*assets\/.*\.css["']/i.test(htmlContent),
        'Local CSS reference found'
    );

    logTest(
        'HTML references local JS',
        /src\s*=\s*["'].*assets\/.*\.js["']/i.test(htmlContent),
        'Local JS reference found'
    );
}

// Test 5: Verify offline-first architecture
function testOfflineSupport() {
    logSection('Test 5: Offline Support Verification');
    
    const projectFiles = fs.readdirSync(projectRoot);
    
    // Check for service worker (optional)
    const hasServiceWorker = projectFiles.includes('service-worker.js') || 
                            projectFiles.includes('sw.js') ||
                            fs.existsSync(path.join(projectRoot, 'public', 'service-worker.js'));
    
    // Note: Service worker is optional - app works offline without it
    console.log(`  ℹ INFO: Service worker ${hasServiceWorker ? 'present' : 'not present (optional)'}`);

    // Check for manifest.json (optional)
    const manifestPath = path.join(projectRoot, 'manifest.json');
    const hasManifest = fs.existsSync(manifestPath);
    
    // Note: Manifest is optional for offline functionality
    console.log(`  ℹ INFO: Web app manifest ${hasManifest ? 'present' : 'not present (optional)'}`);

    // Check for offline-first architecture
    const appTsx = path.join(projectRoot, 'components', 'App.tsx');
    if (fs.existsSync(appTsx)) {
        const appContent = fs.readFileSync(appTsx, 'utf-8');
        
        logTest(
            'App uses local state management',
            /useState|useReducer/.test(appContent),
            'Local state found'
        );

        logTest(
            'App has no external API calls',
            !/fetch\s*\(|axios\s*\(|XMLHttpRequest/.test(appContent),
            'No external API calls in main component'
        );
    }
}

// Test 6: Verify build output is complete
function testBuildCompleteness() {
    logSection('Test 6: Build Completeness Verification');
    
    const distDir = path.join(projectRoot, 'dist');
    const assetsDir = path.join(distDir, 'assets');
    
    logTest(
        'dist directory exists',
        fs.existsSync(distDir),
        'Build output directory found'
    );

    logTest(
        'assets directory exists',
        fs.existsSync(assetsDir),
        'Assets directory found'
    );

    // Check for required files
    const requiredFiles = [
        { name: 'index.html', path: path.join(distDir, 'index.html') },
        { name: 'index.js', path: path.join(assetsDir, 'index.js') },
        { name: 'style.css', path: path.join(assetsDir, 'style.css') }
    ];

    requiredFiles.forEach(file => {
        const exists = fs.existsSync(file.path);
        logTest(
            `${file.name} exists`,
            exists,
            exists ? 'Found' : 'Not found'
        );
    });

    // Check file sizes
    const indexJsPath = path.join(assetsDir, 'index.js');
    if (fs.existsSync(indexJsPath)) {
        const stats = fs.statSync(indexJsPath);
        logTest(
            'index.js has all dependencies',
            stats.size > 300000, // Should be > 300KB
            `Size: ${(stats.size / 1024).toFixed(2)} KB`
        );
    }
}

// Test 7: Verify no network requests in code
function testNoNetworkRequests() {
    logSection('Test 7: Network Request Prevention');
    
    const appTsx = path.join(projectRoot, 'components', 'App.tsx');
    
    if (!fs.existsSync(appTsx)) {
        logTest('App.tsx exists', false, 'Not found');
        return;
    }

    const appContent = fs.readFileSync(appTsx, 'utf-8');
    
    // Check for network request patterns
    const networkPatterns = [
        { name: 'fetch() calls', pattern: /fetch\s*\(/ },
        { name: 'XMLHttpRequest', pattern: /XMLHttpRequest|new\s+XMLHttpRequest/ },
        { name: 'axios calls', pattern: /axios\s*\(|axios\s*\./ },
        { name: 'http:// URLs', pattern: /["']http:\/\/[^"']*["']/ },
        { name: 'https:// URLs', pattern: /["']https:\/\/[^"']*["']/ }
    ];

    networkPatterns.forEach(pattern => {
        const found = pattern.pattern.test(appContent);
        logTest(
            `No ${pattern.name}`,
            !found,
            found ? 'WARNING: Found' : 'Clean'
        );
    });
}

// Main test runner
function runAllTests() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Offline Functionality Tests - Task 8.3                    ║');
    console.log('║  Feature: csp-compliance-fix                               ║');
    console.log('║  Property 6: 离线可用性                                     ║');
    console.log('║  Validates: Requirements 2.6                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    testLocalDependencies();
    testNoExternalApiCalls();
    testSelfContainedCss();
    testSelfContainedHtml();
    testOfflineSupport();
    testBuildCompleteness();
    testNoNetworkRequests();

    // Print summary
    logSection('Test Summary');
    const total = testResults.passed + testResults.failed;
    const percentage = total > 0 ? Math.round((testResults.passed / total) * 100) : 0;
    
    console.log(`\nTotal Tests: ${total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${percentage}%`);

    if (testResults.failed === 0) {
        console.log('\n✓ All tests passed!');
        process.exit(0);
    } else {
        console.log(`\n✗ ${testResults.failed} test(s) failed`);
        process.exit(1);
    }
}

// Run tests
runAllTests();
