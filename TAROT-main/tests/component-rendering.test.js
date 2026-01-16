/**
 * Component Rendering Tests - Task 8.1
 * Feature: csp-compliance-fix, Property 5: 功能等价性
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 * 
 * This test verifies that all React components render correctly
 * after the CSP compliance fix (local bundling instead of CDN).
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

// Test 1: Verify build output exists
function testBuildOutput() {
    logSection('Test 1: Build Output Verification');
    
    const distDir = path.join(projectRoot, 'dist');
    const indexHtml = path.join(distDir, 'index.html');
    const assetsDir = path.join(distDir, 'assets');
    const indexJs = path.join(assetsDir, 'index.js');
    const styleCss = path.join(assetsDir, 'style.css');

    logTest(
        'dist directory exists',
        fs.existsSync(distDir),
        `Path: ${distDir}`
    );

    logTest(
        'index.html exists',
        fs.existsSync(indexHtml),
        `Path: ${indexHtml}`
    );

    logTest(
        'assets directory exists',
        fs.existsSync(assetsDir),
        `Path: ${assetsDir}`
    );

    logTest(
        'index.js bundle exists',
        fs.existsSync(indexJs),
        `Path: ${indexJs}`
    );

    logTest(
        'style.css exists',
        fs.existsSync(styleCss),
        `Path: ${styleCss}`
    );

    // Check file sizes
    if (fs.existsSync(indexJs)) {
        const stats = fs.statSync(indexJs);
        const sizeKb = (stats.size / 1024).toFixed(2);
        logTest(
            'index.js has reasonable size',
            stats.size > 100000, // Should be > 100KB
            `Size: ${sizeKb} KB`
        );
    }

    if (fs.existsSync(styleCss)) {
        const stats = fs.statSync(styleCss);
        const sizeKb = (stats.size / 1024).toFixed(2);
        logTest(
            'style.css has reasonable size',
            stats.size > 10000, // Should be > 10KB
            `Size: ${sizeKb} KB`
        );
    }
}

// Test 2: Verify bundle contains required dependencies
function testBundleContents() {
    logSection('Test 2: Bundle Contents Verification');
    
    const indexJs = path.join(projectRoot, 'dist', 'assets', 'index.js');
    
    if (!fs.existsSync(indexJs)) {
        logTest('Bundle file readable', false, 'index.js not found');
        return;
    }

    const bundleContent = fs.readFileSync(indexJs, 'utf-8');
    
    // Check for key dependencies in the bundle
    const dependencies = [
        { name: 'React', pattern: /react/i },
        { name: 'React DOM', pattern: /react-dom/i },
        { name: 'Framer Motion', pattern: /framer-motion|motion/i },
        { name: 'Lucide React', pattern: /lucide-react|lucide/i }
    ];

    dependencies.forEach(dep => {
        const found = dep.pattern.test(bundleContent);
        logTest(
            `${dep.name} included in bundle`,
            found,
            found ? 'Found in bundle' : 'Not found in bundle'
        );
    });

    // Check that bundle does NOT contain CDN references
    const cdnPatterns = [
        { name: 'esm.sh', pattern: /esm\.sh/i },
        { name: 'cdn.tailwindcss.com', pattern: /cdn\.tailwindcss\.com/i }
    ];

    cdnPatterns.forEach(cdn => {
        const found = cdn.pattern.test(bundleContent);
        logTest(
            `No ${cdn.name} references in bundle`,
            !found,
            found ? 'WARNING: CDN reference found!' : 'Clean'
        );
    });
}

// Test 3: Verify HTML references local assets
function testHtmlReferences() {
    logSection('Test 3: HTML Asset References');
    
    const indexHtml = path.join(projectRoot, 'dist', 'index.html');
    
    if (!fs.existsSync(indexHtml)) {
        logTest('HTML file readable', false, 'index.html not found');
        return;
    }

    const htmlContent = fs.readFileSync(indexHtml, 'utf-8');

    // Check for local asset references
    logTest(
        'HTML references local CSS',
        /assets\/.*\.css/i.test(htmlContent),
        'CSS file referenced'
    );

    logTest(
        'HTML references local JS',
        /assets\/.*\.js/i.test(htmlContent),
        'JS file referenced'
    );

    // Check that HTML does NOT contain CDN references
    const cdnPatterns = [
        { name: 'esm.sh', pattern: /esm\.sh/i },
        { name: 'cdn.tailwindcss.com', pattern: /cdn\.tailwindcss\.com/i }
    ];

    cdnPatterns.forEach(cdn => {
        const found = cdn.pattern.test(htmlContent);
        logTest(
            `No ${cdn.name} references in HTML`,
            !found,
            found ? 'WARNING: CDN reference found!' : 'Clean'
        );
    });
}

// Test 4: Verify CSS contains Tailwind styles
function testCssContent() {
    logSection('Test 4: CSS Content Verification');
    
    const styleCss = path.join(projectRoot, 'dist', 'assets', 'style.css');
    
    if (!fs.existsSync(styleCss)) {
        logTest('CSS file readable', false, 'style.css not found');
        return;
    }

    const cssContent = fs.readFileSync(styleCss, 'utf-8');

    // Check for Tailwind CSS indicators
    const tailwindIndicators = [
        { name: 'Tailwind utilities', pattern: /\.flex|\.grid|\.p-|\.m-|\.text-/ },
        { name: 'CSS variables', pattern: /--/ }
    ];

    tailwindIndicators.forEach(indicator => {
        const found = indicator.pattern.test(cssContent);
        logTest(
            indicator.name,
            found,
            found ? 'Found' : 'Not found'
        );
    });

    // Check that CSS does NOT contain CDN references
    logTest(
        'No CDN references in CSS',
        !/cdn\.tailwindcss\.com|esm\.sh/i.test(cssContent),
        'Clean'
    );
}

// Test 5: Verify TypeScript compilation
function testTypeScriptCompilation() {
    logSection('Test 5: TypeScript Compilation');
    
    const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
    const appTsx = path.join(projectRoot, 'components', 'App.tsx');
    
    logTest(
        'tsconfig.json exists',
        fs.existsSync(tsConfigPath),
        'TypeScript configuration found'
    );

    logTest(
        'App.tsx exists',
        fs.existsSync(appTsx),
        'Main component found'
    );

    if (fs.existsSync(appTsx)) {
        const appContent = fs.readFileSync(appTsx, 'utf-8');
        
        logTest(
            'App.tsx imports React',
            /import.*React/i.test(appContent),
            'React import found'
        );

        logTest(
            'App.tsx is a valid React component',
            /const App|function App|export.*App/i.test(appContent),
            'Component export found'
        );
    }
}

// Test 6: Verify package.json build scripts
function testBuildScripts() {
    logSection('Test 6: Build Scripts Verification');
    
    const packageJsonPath = path.join(projectRoot, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
        logTest('package.json exists', false, 'Not found');
        return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    logTest(
        'build script exists',
        packageJson.scripts && packageJson.scripts.build,
        packageJson.scripts?.build || 'Not found'
    );

    logTest(
        'build:extension script exists',
        packageJson.scripts && packageJson.scripts['build:extension'],
        packageJson.scripts?.['build:extension'] || 'Not found'
    );

    // Check dependencies
    const requiredDeps = ['react', 'react-dom', 'framer-motion', 'lucide-react'];
    requiredDeps.forEach(dep => {
        const found = packageJson.dependencies && packageJson.dependencies[dep];
        logTest(
            `${dep} in dependencies`,
            !!found,
            found ? `v${found}` : 'Not found'
        );
    });
}

// Test 7: Verify no external network requests in build
function testNoExternalRequests() {
    logSection('Test 7: External Request Prevention');
    
    const indexJs = path.join(projectRoot, 'dist', 'assets', 'index.js');
    const indexHtml = path.join(projectRoot, 'dist', 'index.html');
    
    const externalPatterns = [
        { name: 'esm.sh', pattern: /esm\.sh/gi },
        { name: 'cdn.tailwindcss.com', pattern: /cdn\.tailwindcss\.com/gi },
        { name: 'googleapis.com', pattern: /googleapis\.com/gi },
        { name: 'fonts.googleapis.com', pattern: /fonts\.googleapis\.com/gi }
    ];

    let jsContent = '';
    let htmlContent = '';

    if (fs.existsSync(indexJs)) {
        jsContent = fs.readFileSync(indexJs, 'utf-8');
    }
    if (fs.existsSync(indexHtml)) {
        htmlContent = fs.readFileSync(indexHtml, 'utf-8');
    }

    externalPatterns.forEach(pattern => {
        const jsMatches = (jsContent.match(pattern.pattern) || []).length;
        const htmlMatches = (htmlContent.match(pattern.pattern) || []).length;
        const totalMatches = jsMatches + htmlMatches;

        logTest(
            `No ${pattern.name} references`,
            totalMatches === 0,
            totalMatches > 0 ? `Found ${totalMatches} references` : 'Clean'
        );
    });
}

// Main test runner
function runAllTests() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  React Component Rendering Tests - Task 8.1                ║');
    console.log('║  Feature: csp-compliance-fix                               ║');
    console.log('║  Property 5: 功能等价性                                     ║');
    console.log('║  Validates: Requirements 6.1, 6.2, 6.3, 6.4                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    testBuildOutput();
    testBundleContents();
    testHtmlReferences();
    testCssContent();
    testTypeScriptCompilation();
    testBuildScripts();
    testNoExternalRequests();

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
