/**
 * POS Integration Service V2 for Chrome Extension
 * 
 * Enhanced version with AI support and multi-tier user management.
 * Integrates POSServiceFactory for automatic fallback between AI, NLP, and Frontend approaches.
 * 
 * Features:
 * - User tier-based approach selection (free/paid)
 * - AI → NLP → Frontend degradation strategy
 * - Performance monitoring and statistics
 * - Chrome storage integration for user configuration
 * 
 * Requirements: 10.1-10.5, 11.1-11.5
 */

// Import compiled TypeScript modules
import { POSServiceFactory } from '../dist/services/pos-service-factory.js';
import { UserConfigManager, DEFAULT_USER_CONFIG } from '../dist/config/user-config.js';
import { SimpleColorMapper } from '../dist/services/color-mapper.js';
import { posPerformanceMonitor } from './pos-performance-monitor.js';

/**
 * Enhanced POS Integration Service with AI Support
 */
class POSIntegrationServiceV2 {
  constructor() {
    // Initialize services
    this.serviceFactory = new POSServiceFactory();
    this.configManager = new UserConfigManager();
    this.colorMapper = new SimpleColorMapper();
    this.performanceMonitor = posPerformanceMonitor;
    
    // Performance tracking (legacy - kept for backward compatibility)
    this.stats = {
      totalAnalyses: 0,
      byApproach: {
        ai: { count: 0, totalLatency: 0, errors: 0 },
        nlp: { count: 0, totalLatency: 0, errors: 0 },
        frontend: { count: 0, totalLatency: 0, errors: 0 }
      },
      cacheHits: 0,
      cacheMisses: 0,
      degradationEvents: []
    };
    
    // Initialize flag
    this.initialized = false;
    
    console.log('POS Integration Service V2 created');
  }
  
  /**
   * Initialize the service
   * Must be called before using the service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    try {
      console.log('Initializing POS Integration Service V2...');
      
      // Initialize the service factory (checks AI/NLP availability)
      await this.serviceFactory.initialize();
      
      // Load user configuration
      const userConfig = await this.configManager.getConfig();
      console.log('User configuration loaded:', userConfig);
      
      // Update color scheme if customized
      if (userConfig.colorScheme) {
        this.colorMapper.updateColorScheme(userConfig.colorScheme);
      }
      
      this.initialized = true;
      console.log('POS Integration Service V2 initialized successfully');
      console.log('Service availability:', this.serviceFactory.getServiceAvailability());
    } catch (error) {
      console.error('Failed to initialize POS Integration Service V2:', error);
      // Continue with default configuration
      this.initialized = true;
    }
  }
  
  /**
   * Analyze a word's part of speech in context
   * 
   * @param {string} word - The word to analyze
   * @param {string} sentence - The complete sentence containing the word
   * @param {number} position - The position of the word in the sentence (optional)
   * @returns {Promise<Object>} Analysis result with POS tag and color
   */
  async analyzeWord(word, sentence, position = null) {
    const startTime = Date.now();
    
    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate input
      if (!word || !sentence) {
        return {
          word,
          pos: 'unknown',
          color: this.colorMapper.getColor('unknown'),
          confidence: 0,
          approach: 'frontend',
          cached: false,
          latency: 0
        };
      }
      
      // Get user configuration
      const userConfig = await this.configManager.getConfig();
      
      // Analyze the entire sentence using the factory
      const result = await this.serviceFactory.analyzeWithFallback(sentence, userConfig);
      
      // Find the word in the result
      let wordAnalysis = null;
      if (position !== null && result.words[position]) {
        wordAnalysis = result.words[position];
      } else {
        // Find by word match
        wordAnalysis = result.words.find(w => 
          w.word.toLowerCase() === word.toLowerCase()
        );
      }
      
      if (!wordAnalysis) {
        // Word not found, return unknown
        return {
          word,
          pos: 'unknown',
          color: this.colorMapper.getColor('unknown'),
          confidence: 0,
          approach: result.approach,
          cached: result.cacheHit,
          latency: Date.now() - startTime
        };
      }
      
      // Update statistics
      const latency = Date.now() - startTime;
      this.updateStats(result.approach, latency, result.cacheHit, null);
      
      // Record in performance monitor (Requirement 9.1, 9.5)
      this.performanceMonitor.recordRequest({
        approach: result.approach,
        latency,
        cached: result.cacheHit,
        error: null,
        sentence
      });
      
      return {
        word: wordAnalysis.word,
        pos: wordAnalysis.pos,
        color: this.colorMapper.getColor(wordAnalysis.pos),
        confidence: wordAnalysis.confidence || 0.8,
        approach: result.approach,
        cached: result.cacheHit,
        latency
      };
    } catch (error) {
      console.error('POS word analysis error:', error);
      
      // Update error statistics
      const latency = Date.now() - startTime;
      this.updateStats('frontend', latency, false, error);
      
      // Record error in performance monitor
      this.performanceMonitor.recordRequest({
        approach: 'frontend',
        latency,
        cached: false,
        error,
        sentence
      });
      
      return {
        word,
        pos: 'unknown',
        color: this.colorMapper.getColor('unknown'),
        confidence: 0,
        approach: 'frontend',
        cached: false,
        latency,
        error: error.message
      };
    }
  }
  
  /**
   * Analyze an entire sentence
   * 
   * @param {string} sentence - The sentence to analyze
   * @returns {Promise<Object>} Complete analysis result
   */
  async analyzeSentence(sentence) {
    const startTime = Date.now();
    
    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Get user configuration
      const userConfig = await this.configManager.getConfig();
      
      // Analyze using the factory
      const result = await this.serviceFactory.analyzeWithFallback(sentence, userConfig);
      
      // Add colors to words
      const wordsWithColors = result.words.map(word => ({
        ...word,
        color: this.colorMapper.getColor(word.pos)
      }));
      
      // Update statistics
      const latency = Date.now() - startTime;
      this.updateStats(result.approach, latency, result.cacheHit, null);
      
      // Record in performance monitor
      this.performanceMonitor.recordRequest({
        approach: result.approach,
        latency,
        cached: result.cacheHit,
        error: null,
        sentence
      });
      
      return {
        sentence: result.sentence,
        words: wordsWithColors,
        approach: result.approach,
        cached: result.cacheHit,
        latency
      };
    } catch (error) {
      console.error('Sentence analysis error:', error);
      
      // Update error statistics
      const latency = Date.now() - startTime;
      this.updateStats('frontend', latency, false, error);
      
      // Record error in performance monitor
      this.performanceMonitor.recordRequest({
        approach: 'frontend',
        latency,
        cached: false,
        error,
        sentence
      });
      
      return {
        sentence,
        words: [],
        approach: 'frontend',
        cached: false,
        latency,
        error: error.message
      };
    }
  }
  
  /**
   * Update statistics
   * @private
   */
  updateStats(approach, latency, cached, error) {
    this.stats.totalAnalyses++;
    
    if (cached) {
      this.stats.cacheHits++;
    } else {
      this.stats.cacheMisses++;
    }
    
    if (this.stats.byApproach[approach]) {
      this.stats.byApproach[approach].count++;
      this.stats.byApproach[approach].totalLatency += latency;
      
      if (error) {
        this.stats.byApproach[approach].errors++;
      }
    }
  }
  
  /**
   * Record a degradation event
   * @private
   */
  recordDegradation(from, to, reason) {
    this.stats.degradationEvents.push({
      from,
      to,
      reason,
      timestamp: Date.now()
    });
    
    // Keep only last 100 events
    if (this.stats.degradationEvents.length > 100) {
      this.stats.degradationEvents.shift();
    }
    
    // Record in performance monitor
    this.performanceMonitor.recordDegradation(from, to, reason);
  }
  
  /**
   * Get service statistics
   * 
   * @returns {Object} Service statistics including approach usage and performance
   */
  getStats() {
    // Get enhanced metrics from performance monitor
    const performanceMetrics = this.performanceMonitor.getSummary();
    
    // Legacy stats format (for backward compatibility)
    const stats = {
      totalAnalyses: this.stats.totalAnalyses,
      cacheHitRate: this.stats.totalAnalyses > 0 
        ? (this.stats.cacheHits / this.stats.totalAnalyses * 100).toFixed(2) + '%'
        : '0%',
      byApproach: {}
    };
    
    // Calculate average latency for each approach
    Object.keys(this.stats.byApproach).forEach(approach => {
      const data = this.stats.byApproach[approach];
      stats.byApproach[approach] = {
        count: data.count,
        averageLatency: data.count > 0 
          ? (data.totalLatency / data.count).toFixed(2) + 'ms'
          : '0ms',
        errors: data.errors,
        errorRate: data.count > 0
          ? (data.errors / data.count * 100).toFixed(2) + '%'
          : '0%'
      };
    });
    
    // Add degradation events
    stats.recentDegradations = this.stats.degradationEvents.slice(-10);
    
    // Add service availability
    stats.serviceAvailability = this.serviceFactory.getServiceAvailability();
    
    // Add enhanced performance metrics
    stats.performance = performanceMetrics;
    
    return stats;
  }
  
  /**
   * Get user configuration
   * 
   * @returns {Promise<Object>} User configuration
   */
  async getUserConfig() {
    return await this.configManager.getConfig();
  }
  
  /**
   * Update user configuration
   * 
   * @param {Object} config - Partial configuration to update
   * @returns {Promise<void>}
   */
  async updateUserConfig(config) {
    await this.configManager.setConfig(config);
    
    // Update color scheme if changed
    if (config.colorScheme) {
      this.colorMapper.updateColorScheme(config.colorScheme);
    }
    
    // Refresh service availability if approach changed
    if (config.preferredApproach) {
      await this.serviceFactory.refreshServiceAvailability();
    }
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
   * Refresh service availability
   * Re-checks AI and NLP service availability
   * 
   * @returns {Promise<Object>} Updated service availability
   */
  async refreshServiceAvailability() {
    await this.serviceFactory.refreshServiceAvailability();
    return this.serviceFactory.getServiceAvailability();
  }
  
  /**
   * Export statistics for analysis
   * 
   * @returns {Object} Detailed statistics
   */
  exportStats() {
    return {
      legacy: this.stats,
      performance: this.performanceMonitor.exportMetrics(),
      exportedAt: new Date().toISOString(),
      serviceAvailability: this.serviceFactory.getServiceAvailability()
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalAnalyses: 0,
      byApproach: {
        ai: { count: 0, totalLatency: 0, errors: 0 },
        nlp: { count: 0, totalLatency: 0, errors: 0 },
        frontend: { count: 0, totalLatency: 0, errors: 0 }
      },
      cacheHits: 0,
      cacheMisses: 0,
      degradationEvents: []
    };
    
    // Reset performance monitor
    this.performanceMonitor.reset();
  }
}

// Create singleton instance
const posIntegrationServiceV2 = new POSIntegrationServiceV2();

// Export for use in background.js
self.posIntegrationServiceV2 = posIntegrationServiceV2;

// Also export for ES6 imports
export { posIntegrationServiceV2, POSIntegrationServiceV2 };
