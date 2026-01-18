/**
 * Part-of-Speech Recognition Type Definitions
 * 
 * This file defines the core TypeScript interfaces and types for the POS recognition system.
 * These types support three implementation approaches: frontend, NLP backend, and AI-enhanced.
 */

/**
 * Simplified part-of-speech tags used throughout the system
 */
export type POSTag = 'noun' | 'verb' | 'adjective' | 'adverb' | 'unknown';

/**
 * Represents a single word token in a sentence
 */
export interface Token {
  /** The actual word text */
  word: string;
  /** Position index in the sentence (0-based) */
  position: number;
  /** Optional raw POS tag (before context analysis) */
  rawPOS?: POSTag;
}

/**
 * Context information for analyzing a word's part of speech
 */
export interface Context {
  /** Tokens appearing before the target word */
  previousTokens: Token[];
  /** Tokens appearing after the target word */
  nextTokens: Token[];
  /** The complete sentence being analyzed */
  sentence: string;
}

/**
 * Grammar patterns used for POS identification
 */
export type Pattern = 
  | 'determiner_participle_noun'    // e.g., "a broken window"
  | 'intensifier_participle'        // e.g., "very excited"
  | 'be_participle_by'              // e.g., "was written by"
  | 'linking_verb_participle';      // e.g., "is broken"

/**
 * Complete result of POS analysis for a sentence
 */
export interface POSAnalysisResult {
  /** The original sentence analyzed */
  sentence: string;
  /** Analysis results for each word */
  words: WordAnalysis[];
  /** Which approach was used for analysis */
  approach: 'frontend' | 'nlp' | 'ai';
  /** Timestamp when analysis was performed */
  timestamp: number;
  /** Whether this result came from cache */
  cacheHit: boolean;
}

/**
 * Analysis result for a single word
 */
export interface WordAnalysis {
  /** The word being analyzed */
  word: string;
  /** Position in the sentence */
  position: number;
  /** Identified part of speech */
  pos: POSTag;
  /** Confidence score (0-1), optional */
  confidence?: number;
  /** Explanation for ambiguous cases, optional */
  explanation?: string;
}

/**
 * Cached POS result structure
 */
export interface CachedPOSResult {
  /** The sentence that was analyzed */
  sentence: string;
  /** Map of position to POS tag */
  posMap: Map<number, POSTag>;
  /** When this result was cached */
  timestamp: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Current cache size */
  size: number;
  /** Hit rate percentage */
  hitRate: number;
}

/**
 * Color scheme for POS visualization
 */
export interface ColorScheme {
  noun: string;
  verb: string;
  adjective: string;
  adverb: string;
  unknown: string;
}

/**
 * User configuration
 */
export interface UserConfig {
  /** User tier level */
  tier: 'free' | 'paid';
  /** Preferred analysis approach */
  preferredApproach: 'frontend' | 'nlp' | 'ai' | 'auto';
  /** Whether to enable caching */
  enableCache: boolean;
  /** Color scheme for visualization */
  colorScheme: ColorScheme;
}

/**
 * Irregular verb mapping entry
 */
export interface IrregularVerb {
  /** Base form of the verb */
  base: string;
  /** Past simple form */
  pastSimple: string;
  /** Past participle form */
  pastParticiple: string;
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
  /** Which approach was used */
  approach: string;
  /** Average latency in milliseconds */
  averageLatency: number;
  /** Cache hit rate percentage */
  cacheHitRate: number;
  /** Accuracy percentage */
  accuracy: number;
  /** Total number of requests */
  totalRequests: number;
}
