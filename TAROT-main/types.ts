export interface TarotCard {
  id: string;
  name: string;
  name_en: string; // English name for prompting
  isMajor: boolean;
  meaningUpright: string;
  meaningReversed: string;
}

export interface DrawnCard extends TarotCard {
  isReversed: boolean;
  position: 'Past' | 'Present' | 'Future';
  imageUrl?: string; // Generated image URL
  isGeneratingImage: boolean;
  isRevealed: boolean; // Track if the user has flipped this specific card
}

export interface ReadingHistoryItem {
  id: string;
  timestamp: number;
  cards: Omit<DrawnCard, 'imageUrl'>[]; // Don't store images in history to save localStorage space
  reading: string;
}

export type GameState = 'intro' | 'shuffling' | 'selecting' | 'processing_report' | 'done';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseX: number;
  baseY: number;
  density: number;
  baseAlpha: number; // For variable brightness (twinkling/depth effect)
}