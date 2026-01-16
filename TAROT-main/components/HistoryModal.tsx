import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, ChevronDown, ChevronUp, Trash2, Clock } from 'lucide-react';
import { ReadingHistoryItem } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ReadingHistoryItem[];
  onClearHistory: () => void;
}

const MotionDiv = motion.div as any;

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onClearHistory }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />

          {/* Modal Container */}
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-[10%] md:left-[50%] md:w-full md:max-w-3xl md:-translate-x-1/2 md:h-[80vh] bg-[#0f0518] border border-purple-500/30 rounded-xl shadow-[0_0_50px_rgba(88,28,135,0.5)] z-[101] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-purple-500/20 bg-[#1a0b2e]/50">
              <div className="flex items-center gap-3">
                <Clock className="text-purple-300 w-5 h-5" />
                <h2 className="text-2xl font-heading text-purple-100 tracking-widest">CHRONICLES</h2>
              </div>
              <div className="flex items-center gap-4">
                {history.length > 0 && (
                    <button 
                        onClick={onClearHistory}
                        className="text-xs text-red-400/60 hover:text-red-400 flex items-center gap-1 transition-colors uppercase tracking-wider"
                    >
                        <Trash2 size={14} /> Clear All
                    </button>
                )}
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-purple-200"
                >
                    <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-purple-300/40 space-y-4">
                  <Clock size={48} strokeWidth={1} />
                  <p className="font-serif italic text-lg">The void is silent. No past to reveal.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div 
                        key={item.id} 
                        className={`border transition-all duration-300 rounded-lg overflow-hidden ${
                            expandedId === item.id 
                            ? 'bg-[#1a0b2e]/80 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                            : 'bg-[#1a0b2e]/30 border-purple-500/10 hover:border-purple-500/30 hover:bg-[#1a0b2e]/50'
                        }`}
                    >
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                          <span className="text-xs font-mono text-purple-400/70 flex items-center gap-2 bg-purple-900/20 px-2 py-1 rounded">
                            <Calendar size={12} />
                            {formatDate(item.timestamp)}
                          </span>
                          
                          <div className="flex gap-2">
                            {item.cards.map((card, idx) => (
                                <span key={idx} className="text-sm text-purple-100 font-serif border border-purple-500/20 px-2 py-0.5 rounded bg-[#0f0518]">
                                    {card.name} {card.isReversed ? '(R)' : ''}
                                </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className={`text-purple-300 transition-transform duration-300 ${expandedId === item.id ? 'rotate-180' : ''}`}>
                           <ChevronDown />
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedId === item.id && (
                          <MotionDiv
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 md:p-6 border-t border-purple-500/20 bg-[#0f0518]/50">
                              <div className="prose prose-invert prose-sm max-w-none font-serif text-purple-200/90 leading-relaxed whitespace-pre-wrap">
                                {item.reading}
                              </div>
                            </div>
                          </MotionDiv>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer Decoration */}
             <div className="h-1 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"></div>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );
};

export default HistoryModal;