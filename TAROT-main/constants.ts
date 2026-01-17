import { TarotCard } from './types';

// A subset of cards for the demo, or a full list. 
// For brevity in this code generation, I'll include the Major Arcana.
export const MAJOR_ARCANA: TarotCard[] = [
  { id: '0', name: '愚者', name_en: 'The Fool', isMajor: true, meaningUpright: 'Beginnings, innocence, spontaneity', meaningReversed: 'Recklessness, risk-taking' },
  { id: '1', name: '魔术师', name_en: 'The Magician', isMajor: true, meaningUpright: 'Manifestation, resourcefulness, power', meaningReversed: 'Manipulation, poor planning' },
  { id: '2', name: '女祭司', name_en: 'The High Priestess', isMajor: true, meaningUpright: 'Intuition, sacred knowledge, divine feminine', meaningReversed: 'Secrets, disconnected from intuition' },
  { id: '3', name: '皇后', name_en: 'The Empress', isMajor: true, meaningUpright: 'Femininity, beauty, nature, nurturing', meaningReversed: 'Creative block, dependence' },
  { id: '4', name: '皇帝', name_en: 'The Emperor', isMajor: true, meaningUpright: 'Authority, establishment, structure', meaningReversed: 'Domination, excessive control' },
  { id: '5', name: '教皇', name_en: 'The Hierophant', isMajor: true, meaningUpright: 'Spiritual wisdom, religious beliefs', meaningReversed: 'Personal beliefs, freedom, challenging status quo' },
  { id: '6', name: '恋人', name_en: 'The Lovers', isMajor: true, meaningUpright: 'Love, harmony, relationships, choices', meaningReversed: 'Self-love, disharmony, imbalance' },
  { id: '7', name: '战车', name_en: 'The Chariot', isMajor: true, meaningUpright: 'Control, willpower, success, action', meaningReversed: 'Self-discipline, opposition, lack of direction' },
  { id: '8', name: '力量', name_en: 'Strength', isMajor: true, meaningUpright: 'Strength, courage, persuasion, influence', meaningReversed: 'Inner strength, self-doubt, low energy' },
  { id: '9', name: '隐士', name_en: 'The Hermit', isMajor: true, meaningUpright: 'Soul-searching, introspection, being alone', meaningReversed: 'Isolation, loneliness, withdrawal' },
  { id: '10', name: '命运之轮', name_en: 'Wheel of Fortune', isMajor: true, meaningUpright: 'Good luck, karma, life cycles, destiny', meaningReversed: 'Bad luck, resistance to change' },
  { id: '11', name: '正义', name_en: 'Justice', isMajor: true, meaningUpright: 'Justice, fairness, truth, cause and effect', meaningReversed: 'Unfairness, lack of accountability' },
  { id: '12', name: '倒吊人', name_en: 'The Hanged Man', isMajor: true, meaningUpright: 'Pause, surrender, letting go, new perspectives', meaningReversed: 'Delays, resistance, stalling' },
  { id: '13', name: '死神', name_en: 'Death', isMajor: true, meaningUpright: 'Endings, change, transformation, transition', meaningReversed: 'Resistance to change, personal transformation' },
  { id: '14', name: '节制', name_en: 'Temperance', isMajor: true, meaningUpright: 'Balance, moderation, patience, purpose', meaningReversed: 'Imbalance, excess, self-healing' },
  { id: '15', name: '恶魔', name_en: 'The Devil', isMajor: true, meaningUpright: 'Shadow self, attachment, addiction, restriction', meaningReversed: 'Releasing limiting beliefs, exploring dark thoughts' },
  { id: '16', name: '高塔', name_en: 'The Tower', isMajor: true, meaningUpright: 'Sudden change, upheaval, chaos, revelation', meaningReversed: 'Personal transformation, fear of change' },
  { id: '17', name: '星星', name_en: 'The Star', isMajor: true, meaningUpright: 'Hope, faith, purpose, renewal, spirituality', meaningReversed: 'Lack of faith, despair, self-trust' },
  { id: '18', name: '月亮', name_en: 'The Moon', isMajor: true, meaningUpright: 'Illusion, fear, anxiety, subconscious, intuition', meaningReversed: 'Release of fear, repressed emotion' },
  { id: '19', name: '太阳', name_en: 'The Sun', isMajor: true, meaningUpright: 'Positivity, fun, warmth, success, vitality', meaningReversed: 'Inner child, feeling down, overly optimistic' },
  { id: '20', name: '审判', name_en: 'Judgement', isMajor: true, meaningUpright: 'Judgement, rebirth, inner calling, absolution', meaningReversed: 'Self-doubt, inner critic, ignoring the call' },
  { id: '21', name: '世界', name_en: 'The World', isMajor: true, meaningUpright: 'Completion, integration, accomplishment, travel', meaningReversed: 'Seeking personal closure, short-cuts, delays' },
];

// Helper to get random cards using Fisher-Yates Shuffle for true randomness
export const getRandomCards = (count: number): TarotCard[] => {
  const shuffled = [...MAJOR_ARCANA];
  
  // Fisher-Yates algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
};