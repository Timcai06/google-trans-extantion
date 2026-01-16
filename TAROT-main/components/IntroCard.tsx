import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { MysticCardBack } from './Card';

interface IntroCardProps {
  onClick: () => void;
  onHover: (rect: DOMRect | null) => void;
}

const MotionDiv = motion.div as any;

const IntroCard: React.FC<IntroCardProps> = ({ onClick, onHover }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative w-48 h-72 md:w-56 md:h-80 perspective-1000 group">
       {/* Deck Stack Effect (Cards behind) - Enriched Colors */}
       {[1, 2, 3].map((i) => (
         <MotionDiv
            key={i}
            initial={{ rotate: (i * 2), x: i * 2, y: i * 2, opacity: 0 }}
            animate={{ opacity: 1 - (i * 0.15) }}
            className="absolute inset-0 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-[#1e1b4b] to-[#4c1d95] shadow-lg pointer-events-none"
            style={{ zIndex: -i }}
         >
            <div className="w-full h-full opacity-40 mix-blend-overlay">
               <MysticCardBack />
            </div>
         </MotionDiv>
       ))}

      <MotionDiv
        ref={cardRef}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 1.1, opacity: 0, filter: 'blur(10px)', transition: { duration: 0.4 } }}
        whileHover={{ scale: 1.05, y: -20, rotate: -1 }}
        whileTap={{ scale: 0.95, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onHoverStart={() => {
          if (cardRef.current) onHover(cardRef.current.getBoundingClientRect());
        }}
        onHoverEnd={() => onHover(null)}
        onClick={onClick}
        className="relative w-full h-full cursor-pointer z-10"
      >
          {/* Active Glow effect - Greatly Expanded Range */}
          <div className="absolute -inset-10 bg-gradient-to-tr from-purple-600/0 via-fuchsia-500/20 to-cyan-500/0 blur-[40px] rounded-[30px] opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none"></div>
          
          <div className="relative w-full h-full rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-shadow duration-500 group-hover:shadow-[0_0_80px_rgba(139,92,246,0.6)]">
               {/* Richer Border and Background */}
               <div className="w-full h-full rounded-xl overflow-hidden border-2 border-purple-400/40 group-hover:border-fuchsia-300/80 transition-colors duration-300 relative bg-[#0f0518]">
                  {/* Underlay Gradient for richness */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-fuchsia-900/40 z-0"></div>
                  <div className="relative z-10 w-full h-full">
                     <MysticCardBack />
                  </div>
               </div>
               
               {/* Shimmer Overlay */}
               <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-purple-900/90 via-transparent to-white/5 opacity-60 mix-blend-overlay group-hover:opacity-80 transition-opacity"></div>

               {/* Overlay Text */}
               <div className="absolute bottom-12 left-0 right-0 text-center pointer-events-none z-20">
                   <MotionDiv 
                     className="inline-block"
                     animate={{ y: [0, -6, 0] }}
                     transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                   >
                     <div className="px-8 py-3 rounded-full backdrop-blur-xl bg-gradient-to-r from-purple-950/80 to-indigo-950/80 border border-purple-300/50 shadow-[0_0_25px_rgba(168,85,247,0.4)] group-hover:border-fuchsia-200/80 group-hover:shadow-[0_0_35px_rgba(232,121,249,0.6)] transition-all">
                        <p className="font-heading text-transparent bg-clip-text bg-gradient-to-r from-purple-100 to-fuchsia-100 text-xl tracking-[0.3em] drop-shadow-[0_2px_4px_rgba(0,0,0,1)] font-bold">
                          START
                        </p>
                     </div>
                   </MotionDiv>
                   <p className="font-serif italic text-purple-200/70 text-xs mt-4 tracking-[0.2em] uppercase opacity-60 group-hover:opacity-100 transition-opacity duration-700 text-shadow-sm">
                      Unveil the Unknown
                   </p>
               </div>
          </div>
      </MotionDiv>
    </div>
  );
};

export default IntroCard;