import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, RotateCcw, Sparkles, Search } from 'lucide-react';
import { MAJOR_ARCANA } from '../constants';

interface DeckLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MotionDiv = motion.div as any;

const DeckLibraryModal: React.FC<DeckLibraryModalProps> = ({ isOpen, onClose }) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedCard = MAJOR_ARCANA.find(c => c.id === selectedCardId);

  const filteredCards = MAJOR_ARCANA.filter(c => 
     c.name.includes(searchTerm) || c.name_en.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            className="fixed inset-0 bg-[#05020a]/90 backdrop-blur-md z-[100]"
          />

          {/* Modal Container */}
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="fixed inset-4 md:inset-auto md:top-[5%] md:left-[50%] md:w-full md:max-w-5xl md:-translate-x-1/2 md:h-[90vh] bg-[#0a0514] border border-purple-500/30 rounded-2xl shadow-[0_0_80px_rgba(88,28,135,0.4)] z-[101] flex flex-col overflow-hidden ring-1 ring-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-purple-500/20 bg-gradient-to-r from-[#1a0b2e] to-[#0f0518] relative">
               {/* Search Bar */}
               <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-3 text-purple-200">
                    <div className="p-2 rounded-lg bg-purple-900/30 border border-purple-500/30">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="hidden md:block">
                        <h2 className="text-xl font-heading tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-fuchsia-200">ARCHIVES</h2>
                    </div>
                  </div>
                  
                  <div className="relative group flex-1 max-w-xs ml-4">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 group-focus-within:text-white transition-colors" />
                     <input 
                       type="text" 
                       placeholder="Search Arcana..." 
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="w-full bg-black/40 border border-purple-500/20 rounded-full py-2 pl-10 pr-4 text-sm text-purple-100 placeholder-purple-500/50 focus:outline-none focus:border-purple-400/60 focus:bg-purple-900/10 transition-all"
                     />
                  </div>
               </div>

              <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-purple-200"
              >
                  <X size={24} />
              </button>
            </div>

            {/* Content Layout */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
              
              {/* Left Panel: Card Grid */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-purple-900/10 via-[#0a0514] to-[#0a0514]">
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredCards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCardId(card.id)}
                        className={`group relative aspect-[2/3] rounded-xl border transition-all duration-500 overflow-hidden flex flex-col items-center justify-between p-4 text-center
                          ${selectedCardId === card.id 
                            ? 'bg-gradient-to-b from-purple-900/60 to-black border-fuchsia-400 shadow-[0_0_20px_rgba(192,38,211,0.3)] scale-[1.02]' 
                            : 'bg-white/5 border-white/5 hover:border-purple-400/40 hover:bg-purple-900/20 hover:shadow-lg'
                          }`}
                      >
                         {/* Card Id Decoration */}
                         <div className={`absolute top-2 right-3 font-mono text-xs opacity-50 ${selectedCardId === card.id ? 'text-fuchsia-300' : 'text-purple-500'}`}>
                            {card.id.padStart(2, '0')}
                         </div>
                         
                         {/* Center Symbol Placeholder */}
                         <div className="flex-1 flex items-center justify-center w-full">
                            <div className={`w-12 h-12 rounded-full border border-dashed flex items-center justify-center transition-all duration-500
                                ${selectedCardId === card.id ? 'border-fuchsia-400/60 bg-fuchsia-500/10 rotate-180' : 'border-purple-500/20 group-hover:border-purple-400/40'}
                            `}>
                                <div className={`w-8 h-8 rounded-full border opacity-50 ${selectedCardId === card.id ? 'border-fuchsia-300' : 'border-purple-500/30'}`}></div>
                            </div>
                         </div>
                         
                         <div className="relative z-10 w-full">
                            <h3 className={`font-heading text-xs md:text-sm uppercase tracking-wider truncate transition-colors ${selectedCardId === card.id ? 'text-white font-bold' : 'text-purple-300 group-hover:text-purple-100'}`}>
                              {card.name}
                            </h3>
                            <p className="text-[9px] font-mono text-purple-400/50 mt-1 truncate">{card.name_en}</p>
                         </div>
                         
                         {/* Hover Glow */}
                         <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      </button>
                    ))}
                 </div>
              </div>

              {/* Right Panel: Details View - "Digital Grimoire" Style */}
              <div className="w-full md:w-[400px] lg:w-[450px] bg-[#0c0617] border-l border-purple-500/20 overflow-y-auto custom-scrollbar relative shadow-2xl z-10">
                 
                 {/* Background Runes */}
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-screen pointer-events-none"></div>
                 <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none"></div>

                 <AnimatePresence mode="wait">
                   {selectedCard ? (
                     <MotionDiv
                       key={selectedCard.id}
                       initial={{ opacity: 0, x: 50 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: 50 }}
                       transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
                       className="p-8 h-full flex flex-col relative"
                     >
                        {/* Header Section */}
                        <div className="text-center relative mb-8">
                           <div className="inline-block relative px-8 py-4 border-y border-purple-500/30 w-full">
                              <h2 className="text-3xl font-heading text-white tracking-[0.2em] drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                                {selectedCard.name}
                              </h2>
                              <p className="text-xs font-mono text-fuchsia-400 uppercase tracking-widest mt-2 opacity-80">
                                {selectedCard.name_en}
                              </p>
                           </div>
                           {/* Roman Numeral Effect */}
                           <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[80px] font-heading text-purple-900/20 pointer-events-none select-none">
                              {selectedCard.id}
                           </div>
                        </div>

                        {/* Content Scroll */}
                        <div className="space-y-6 flex-1">
                           
                           {/* Upright Block */}
                           <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/20 to-[#0a0514] border border-purple-500/30 p-6 transition-all hover:border-purple-400/50 hover:shadow-[0_0_30px_rgba(147,51,234,0.1)]">
                              <div className="flex items-center gap-2 mb-3">
                                 <Sparkles size={14} className="text-purple-300" />
                                 <span className="text-xs font-bold font-heading text-purple-200 uppercase tracking-widest">Upright Essence</span>
                              </div>
                              <p className="text-purple-100/80 leading-relaxed font-serif text-lg italic border-l-2 border-purple-500/30 pl-4">
                                 "{selectedCard.meaningUpright}"
                              </p>
                           </div>

                           {/* Reversed Block */}
                           <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-900/10 to-[#0a0514] border border-red-500/20 p-6 transition-all hover:border-red-400/40 hover:shadow-[0_0_30px_rgba(220,38,38,0.1)]">
                              <div className="flex items-center gap-2 mb-3">
                                 <RotateCcw size={14} className="text-red-400" />
                                 <span className="text-xs font-bold font-heading text-red-300 uppercase tracking-widest">Reversed Shadow</span>
                              </div>
                              <p className="text-red-100/80 leading-relaxed font-serif text-lg italic border-l-2 border-red-500/30 pl-4">
                                 "{selectedCard.meaningReversed}"
                              </p>
                           </div>

                           {/* Decorative Filler */}
                           <div className="pt-8 flex justify-center opacity-40">
                              <div className="w-full h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                           </div>
                        </div>

                     </MotionDiv>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-30 select-none">
                        <div className="w-24 h-24 rounded-full border-2 border-dashed border-purple-500/50 flex items-center justify-center mb-6 animate-spin-slow">
                            <BookOpen size={32} className="text-purple-400" />
                        </div>
                        <p className="font-heading text-xl text-purple-200 tracking-widest">SELECT A CARD</p>
                        <p className="font-mono text-xs text-purple-400 mt-2">To Decrypt Its Meaning</p>
                     </div>
                   )}
                 </AnimatePresence>
              </div>

            </div>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );
};

export default DeckLibraryModal;