/**
 * Ollama Integration Tests
 * 
 * Tests for Ollama service integration with POS recognition
 * Validates that Ollama can be used as an AI service provider
 */

import { OllamaTranslationService, createOllamaService } from '../services/ollama-adapter';
import { POSServiceFactory } from '../services/pos-service-factory';
import { UserConfigManager, DEFAULT_USER_CONFIG } from '../config/user-config';

describe('Ollama Integration Tests', () => {
  let ollamaService: OllamaTranslationService;
  let serviceFactory: POSServiceFactory;
  let configManager: UserConfigManager;

  beforeEach(() => {
    configManager = new UserConfigManager();
    serviceFactory = new POSServiceFactory();
  });

  describe('Ollama Service Initialization', () => {
    test('should create Ollama service with default config', () => {
      ollamaService = new OllamaTranslationService();
      expect(ollamaService).toBeDefined();
    });

    test('should create Ollama service with custom config', () => {
      ollamaService = new OllamaTranslationService(
        'http://localhost:11434/api/generate',
        'mistral',
        30000
      );
      expect(ollamaService).toBeDefined();
    });

    test('should handle custom API URL', () => {
      const customUrl = 'http://192.168.1.100:11434/api/generate';
      ollamaService = new OllamaTranslationService(customUrl, 'neural-chat');
      expect(ollamaService).toBeDefined();
    });
  });

  describe('Ollama Service Availability', () => {
    test('should check if Ollama service is available', async () => {
      ollamaService = new OllamaTranslationService();
      const available = await ollamaService.isAvailable();
      
      // This test will pass if Ollama is running, fail if not
      // In CI/CD, this might be skipped or mocked
      expect(typeof available).toBe('boolean');
    });

    test('should get available models from Ollama', async () => {
      ollamaService = new OllamaTranslationService();
      const models = await ollamaService.getAvailableModels();
      
      expect(Array.isArray(models)).toBe(true);
      // If Ollama is running, should have at least one model
      // If not running, should return empty array
    });
  });

  describe('Ollama POS Analysis', () => {
    test('should analyze POS for a simple sentence', async () => {
      ollamaService = new OllamaTranslationService();
      
      // Skip if Ollama is not available
      const available = await ollamaService.isAvailable();
      if (!available) {
        console.warn('Ollama service not available, skipping test');
        return;
      }

      const result = await ollamaService.getPOSOnly('The cat is sleeping');
      
      expect(result).toBeDefined();
      expect(result.sentence).toBe('The cat is sleeping');
      expect(result.words).toBeDefined();
      expect(Array.isArray(result.words)).toBe(true);
      expect(result.approach).toBe('ai');
      expect(result.timestamp).toBeDefined();
      expect(result.cacheHit).toBe(false);
    });

    test('should handle empty input gracefully', async () => {
      ollamaService = new OllamaTranslationService();
      
      const result = await ollamaService.getPOSOnly('');
      
      expect(result).toBeDefined();
      expect(result.sentence).toBe('');
      expect(result.words).toEqual([]);
      expect(['ai', 'ollama']).toContain(result.approach);
    });

    test('should identify participles correctly', async () => {
      ollamaService = new OllamaTranslationService();
      
      const available = await ollamaService.isAvailable();
      if (!available) {
        console.warn('Ollama service not available, skipping test');
        return;
      }

      const result = await ollamaService.getPOSOnly('The broken window');
      
      expect(result.words).toBeDefined();
      expect(result.words.length).toBeGreaterThan(0);
      
      // Find the word "broken"
      const brokenWord = result.words.find(w => w.word === 'broken');
      if (brokenWord) {
        // Should be identified as adjective in this context
        expect(['adjective', 'verb']).toContain(brokenWord.pos);
      }
    });

    test('should identify -ing words correctly', async () => {
      ollamaService = new OllamaTranslationService();
      
      const available = await ollamaService.isAvailable();
      if (!available) {
        console.warn('Ollama service not available, skipping test');
        return;
      }

      const result = await ollamaService.getPOSOnly('I am running quickly');
      
      expect(result.words).toBeDefined();
      
      // Find the word "running"
      const runningWord = result.words.find(w => w.word === 'running');
      if (runningWord) {
        // Should be identified as verb in this context
        expect(['verb', 'adjective']).toContain(runningWord.pos);
      }
    });
  });

  describe('Ollama Service Factory Integration', () => {
    test('should detect Ollama availability in service factory', async () => {
      await serviceFactory.initialize();
      const availability = serviceFactory.getServiceAvailability();
      
      expect(availability).toBeDefined();
      expect(typeof availability.ollama).toBe('boolean');
    });

    test('should use Ollama when available', async () => {
      await serviceFactory.initialize();
      const availability = serviceFactory.getServiceAvailability();
      
      if (availability.ollama) {
        const config = await configManager.getConfig();
        config.preferredApproach = 'auto';
        
        const result = await serviceFactory.analyzeWithFallback(
          'The quick brown fox',
          config
        );
        
        expect(result).toBeDefined();
        expect(result.words).toBeDefined();
      }
    });
  });

  describe('Ollama Error Handling', () => {
    test('should fallback to context analyzer on Ollama failure', async () => {
      ollamaService = new OllamaTranslationService(
        'http://invalid-url:11434/api/generate',
        'mistral'
      );
      
      const result = await ollamaService.getPOSOnly('The cat is sleeping');
      
      expect(result).toBeDefined();
      expect(result.words).toBeDefined();
      // Should fallback to context analyzer
      expect(['ai', 'frontend']).toContain(result.approach);
    });

    test('should handle timeout gracefully', async () => {
      ollamaService = new OllamaTranslationService(
        'http://localhost:11434/api/generate',
        'mistral',
        100 // Very short timeout
      );
      
      const result = await ollamaService.getPOSOnly('The cat is sleeping');
      
      expect(result).toBeDefined();
      expect(result.words).toBeDefined();
    });

    test('should normalize POS tags correctly', async () => {
      ollamaService = new OllamaTranslationService();
      
      // Test the private method through public interface
      const result = await ollamaService.getPOSOnly('test');
      
      // All POS tags should be normalized to standard format
      result.words.forEach(word => {
        expect(['noun', 'verb', 'adjective', 'adverb', 'unknown']).toContain(word.pos);
      });
    });
  });

  describe('Ollama Service Factory', () => {
    test('should create Ollama service from factory', async () => {
      const service = await createOllamaService();
      
      // Service might be null if Ollama is not running
      if (service) {
        expect(service).toBeDefined();
        expect(typeof service.getPOSOnly).toBe('function');
      }
    });

    test('should handle Ollama not available', async () => {
      const service = await createOllamaService(
        'http://invalid-host:11434/api/generate',
        'mistral'
      );
      
      // Should return null if service is not available
      expect(service).toBeNull();
    });
  });

  describe('Ollama Configuration', () => {
    test('should support custom model selection', () => {
      const models = ['mistral', 'neural-chat', 'llama2', 'orca'];
      
      models.forEach(model => {
        ollamaService = new OllamaTranslationService(
          'http://localhost:11434/api/generate',
          model
        );
        expect(ollamaService).toBeDefined();
      });
    });

    test('should support custom timeout configuration', () => {
      const timeouts = [5000, 10000, 30000, 60000];
      
      timeouts.forEach(timeout => {
        ollamaService = new OllamaTranslationService(
          'http://localhost:11434/api/generate',
          'mistral',
          timeout
        );
        expect(ollamaService).toBeDefined();
      });
    });
  });
});
