/**
 * POS Integration Service for Chrome Extension
 * 
 * This module integrates the TypeScript-based POS recognition services
 * into the Chrome extension's background script.
 * 
 * Features:
 * - Context-based POS analysis
 * - Caching for performance
 * - Color mapping for visualization
 * 
 * Requirements: 9.1, 9.5, 11.1-11.5
 */

// Import compiled TypeScript modules
import { ContextAnalyzerImpl } from '../dist/services/context-analyzer.js';
import { SimpleCacheManager } from '../dist/services/cache-manager.js';
import { SimpleColorMapper, DEFAULT_COLOR_SCHEME } from '../dist/services/color-mapper.js';

/**
 * POS Integration Service
 * Provides a unified interface for POS recognition in the Chrome extension
 */
class POSIntegrationService {
  constructor() {
    // Initialize services
    this.contextAnalyzer = new ContextAnalyzerImpl();
    this.cacheManager = new SimpleCacheManager();
    this.colorMapper = new SimpleColorMapper();
    
    // Performance tracking
    this.stats = {
      totalAnalyses: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLatency: 0,
      totalLatency: 0
    };
    
    console.log('POS Integration Service initialized');
  }
  
  /**
   * Analyze a word's part of speech in context
   * 
   * @param {string} word - The word to analyze
   * @param {string} sentence - The complete sentence containing the word
   * @param {number} position - The position of the word in the sentence (optional)
   * @returns {Object} Analysis result with POS tag and color
   */
  analyzeWord(word, sentence, position = null) {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!word || !sentence) {
        return {
          word,
          pos: 'unknown',
          color: this.colorMapper.getColor('unknown'),
          confidence: 0,
          cached: false,
          latency: 0
        };
      }
      
      // Create cache key
      const cacheKey = `${word.toLowerCase()}:${sentence.toLowerCase()}`;
      
      // Check cache first (Requirement 9.2: retrieve in 10ms)
      const cached = this.cacheManager.get(cacheKey);
      if (cached && cached.posMap && cached.posMap.size > 0) {
        this.stats.cacheHits++;
        const pos = cached.posMap.get(0) || 'unknown';
        const latency = Date.now() - startTime;
        
        return {
          word,
          pos,
          color: this.colorMapper.getColor(pos),
          confidence: 0.9,
          cached: true,
          latency
        };
      }
      
      this.stats.cacheMisses++;
      
      // Find word position if not provided
      if (position === null) {
        const words = sentence.toLowerCase().split(/\s+/);
        position = words.indexOf(word.toLowerCase());
        if (position === -1) {
          position = 0;
        }
      }
      
      // Perform POS analysis (Requirement 9.1: complete in 200ms)
      const pos = this.contextAnalyzer.analyzePOS(word, sentence, position);
      
      // Cache the result (Requirement 9.3: store at least 1000 mappings)
      const cacheResult = {
        sentence,
        posMap: new Map([[0, pos]]),
        timestamp: Date.now()
      };
      this.cacheManager.set(cacheKey, cacheResult);
      
      // Get color for visualization
      const color = this.colorMapper.getColor(pos);
      
      // Update statistics
      const latency = Date.now() - startTime;
      this.stats.totalAnalyses++;
      this.stats.totalLatency += latency;
      this.stats.averageLatency = this.stats.totalLatency / this.stats.totalAnalyses;
      
      return {
        word,
        pos,
        color,
        confidence: 0.8,
        cached: false,
        latency
      };
    } catch (error) {
      console.error('POS analysis error:', error);
      return {
        word,
        pos: 'unknown',
        color: this.colorMapper.getColor('unknown'),
        confidence: 0,
        cached: false,
        latency: Date.now() - startTime,
        error: error.message
      };
    }
  }
  
  /**
   * Analyze an entire sentence
   * 
   * @param {string} sentence - The sentence to analyze
   * @returns {Object} Complete analysis result
   */
  analyzeSentence(sentence) {
    const startTime = Date.now();
    
    try {
      // Check cache
      const cacheKey = `sentence:${sentence.toLowerCase()}`;
      const cached = this.cacheManager.get(cacheKey);
      
      if (cached) {
        this.stats.cacheHits++;
        return {
          sentence,
          words: this.convertCachedToWords(cached),
          cached: true,
          latency: Date.now() - startTime
        };
      }
      
      this.stats.cacheMisses++;
      
      // Perform analysis
      const result = this.contextAnalyzer.analyze(sentence);
      
      // Cache the result
      const posMap = new Map();
      result.words.forEach((word, index) => {
        posMap.set(index, word.pos);
      });
      
      const cacheResult = {
        sentence,
        posMap,
        timestamp: Date.now()
      };
      this.cacheManager.set(cacheKey, cacheResult);
      
      // Add colors to words
      const wordsWithColors = result.words.map(word => ({
        ...word,
        color: this.colorMapper.getColor(word.pos)
      }));
      
      const latency = Date.now() - startTime;
      this.stats.totalAnalyses++;
      this.stats.totalLatency += latency;
      this.stats.averageLatency = this.stats.totalLatency / this.stats.totalAnalyses;
      
      return {
        sentence,
        words: wordsWithColors,
        cached: false,
        latency
      };
    } catch (error) {
      console.error('Sentence analysis error:', error);
      return {
        sentence,
        words: [],
        cached: false,
        latency: Date.now() - startTime,
        error: error.message
      };
    }
  }
  
  /**
   * Convert cached result to words array
   * @private
   */
  convertCachedToWords(cached) {
    const words = [];
    const tokens = cached.sentence.split(/\s+/);
    
    cached.posMap.forEach((pos, index) => {
      if (index < tokens.length) {
        words.push({
          word: tokens[index],
          position: index,
          pos,
          color: this.colorMapper.getColor(pos)
        });
      }
    });
    
    return words;
  }
  
  /**
   * Get service statistics
   * 
   * @returns {Object} Service statistics
   */
  getStats() {
    const cacheStats = this.cacheManager.getStats();
    
    return {
      ...this.stats,
      cache: cacheStats
    };
  }
  
  /**
   * Update color scheme
   * 
   * @param {Object} colorScheme - New color scheme
   */
  updateColorScheme(colorScheme) {
    this.colorMapper.updateColorScheme(colorScheme);
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cacheManager.clear();
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
  }
  
  /**
   * Perform cache eviction
   * (Requirement 9.4: evict oldest entries when memory limit exceeded)
   */
  evictCache() {
    this.cacheManager.evict();
  }
}

// Create singleton instance
const posIntegrationService = new POSIntegrationService();

// Export for use in background.js
self.posIntegrationService = posIntegrationService;

// Also export for ES6 imports
export { posIntegrationService, POSIntegrationService };
