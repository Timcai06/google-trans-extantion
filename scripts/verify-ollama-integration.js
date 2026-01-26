#!/usr/bin/env node

/**
 * Ollama Integration Verification Script
 * 
 * This script verifies that Ollama is properly configured and integrated
 * with the extension. Run this to diagnose any issues.
 */

import http from 'http';
import https from 'https';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(title, 'cyan');
  log('='.repeat(60), 'cyan');
}

/**
 * Test HTTP connection to a URL
 */
function testConnection(url, timeout = 5000) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve({ success: false, error: 'Connection timeout' });
    }, timeout);

    try {
      const protocol = url.startsWith('https') ? https : http;
      const request = protocol.get(url, (response) => {
        clearTimeout(timeoutId);
        resolve({
          success: response.statusCode >= 200 && response.statusCode < 300,
          statusCode: response.statusCode,
          error: null
        });
      });

      request.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({ success: false, error: error.message });
      });
    } catch (error) {
      clearTimeout(timeoutId);
      resolve({ success: false, error: error.message });
    }
  });
}

/**
 * Test Ollama API endpoint
 */
async function testOllamaEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint}`;
  logInfo(`Testing ${endpoint}...`);
  
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const request = protocol.request(options, (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          logSuccess(`${endpoint} is accessible (${response.statusCode})`);
          resolve(true);
        } else {
          logWarning(`${endpoint} returned ${response.statusCode}`);
          resolve(false);
        }
      });
      
      request.on('error', (error) => {
        logWarning(`${endpoint} failed: ${error.message}`);
        resolve(false);
      });
      
      // Send a minimal test request
      request.write(JSON.stringify({
        model: 'mistral',
        prompt: 'test',
        stream: false
      }));
      
      request.end();
    } catch (error) {
      logWarning(`${endpoint} error: ${error.message}`);
      resolve(false);
    }
  });
}

/**
 * Get Ollama models
 */
async function getOllamaModels(baseUrl) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(`${baseUrl}/api/tags`);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const request = protocol.get(urlObj, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              success: true,
              models: json.models || []
            });
          } catch (error) {
            resolve({
              success: false,
              error: 'Failed to parse response'
            });
          }
        });
      });
      
      request.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });
    } catch (error) {
      resolve({
        success: false,
        error: error.message
      });
    }
  });
}

/**
 * Main verification function
 */
async function verify() {
  log('\n🔍 Ollama Integration Verification\n', 'cyan');
  
  const ollamaUrls = [
    'http://localhost:11434',
    'http://127.0.0.1:11434',
    'http://ollama:11434'
  ];
  
  let foundOllama = false;
  let workingUrl = null;
  
  // Step 1: Check Ollama availability
  logSection('Step 1: Checking Ollama Service Availability');
  
  for (const url of ollamaUrls) {
    logInfo(`Trying ${url}...`);
    const result = await testConnection(`${url}/api/tags`, 3000);
    
    if (result.success) {
      logSuccess(`Ollama is available at ${url}`);
      foundOllama = true;
      workingUrl = url;
      break;
    } else {
      logWarning(`Not available at ${url}: ${result.error}`);
    }
  }
  
  if (!foundOllama) {
    logError('Ollama service not found at any known address');
    logInfo('Please ensure Ollama is running: ollama serve');
    return false;
  }
  
  // Step 2: Check API endpoints
  logSection('Step 2: Checking API Endpoints');
  
  const endpoints = [
    '/api/generate',
    '/api/chat',
    '/generate'
  ];
  
  let workingEndpoints = [];
  
  for (const endpoint of endpoints) {
    const success = await testOllamaEndpoint(workingUrl, endpoint);
    if (success) {
      workingEndpoints.push(endpoint);
    }
  }
  
  if (workingEndpoints.length === 0) {
    logError('No working API endpoints found');
    return false;
  }
  
  logSuccess(`Found ${workingEndpoints.length} working endpoint(s): ${workingEndpoints.join(', ')}`);
  
  // Step 3: Check available models
  logSection('Step 3: Checking Available Models');
  
  const modelsResult = await getOllamaModels(workingUrl);
  
  if (modelsResult.success && modelsResult.models.length > 0) {
    logSuccess(`Found ${modelsResult.models.length} model(s):`);
    modelsResult.models.forEach((model) => {
      logInfo(`  • ${model.name} (${formatBytes(model.size)})`);
    });
  } else {
    logWarning('No models found or unable to retrieve model list');
    logInfo('Download a model: ollama pull mistral');
  }
  
  // Step 4: Configuration summary
  logSection('Step 4: Configuration Summary');
  
  logSuccess('Ollama Configuration:');
  logInfo(`  Base URL: ${workingUrl}`);
  logInfo(`  Working Endpoints: ${workingEndpoints.join(', ')}`);
  logInfo(`  Models: ${modelsResult.models?.length || 0}`);
  
  // Step 5: Extension configuration
  logSection('Step 5: Extension Configuration');
  
  logInfo('To use Ollama with the extension:');
  logInfo('  1. Open extension settings');
  logInfo('  2. Enable AI service');
  logInfo('  3. Set API URL to: ' + workingUrl + '/api/generate');
  logInfo('  4. Set API Key to: ollama');
  logInfo('  5. Set Model to: mistral (or your preferred model)');
  logInfo('  6. Click "Test Connection"');
  
  // Step 6: Troubleshooting
  logSection('Step 6: Troubleshooting Tips');
  
  logInfo('If you encounter issues:');
  logInfo('  • Check Ollama is running: ps aux | grep ollama');
  logInfo('  • Check firewall: port 11434 should be accessible');
  logInfo('  • Check logs: tail -f ~/.ollama/logs/server.log');
  logInfo('  • Try different model: ollama pull neural-chat');
  logInfo('  • Restart Ollama: killall ollama && ollama serve');
  
  // Final status
  logSection('Verification Complete');
  logSuccess('✨ Ollama is properly configured and ready to use!');
  
  return true;
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Run verification
verify().then((success) => {
  process.exit(success ? 0 : 1);
}).catch((error) => {
  logError(`Verification failed: ${error.message}`);
  process.exit(1);
});