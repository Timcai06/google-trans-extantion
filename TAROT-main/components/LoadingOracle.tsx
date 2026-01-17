import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;
const MotionP = motion.p as any;

const LoadingOracle: React.FC = () => {
  const [loadingText, setLoadingText] = useState("COMMUNING WITH STARS...");
  
  useEffect(() => {
    const texts = [
      "COMMUNING WITH STARS...",
      "ALIGNING CONSTELLATIONS...",
      "READING THE VOID...",
      "SYNTHESIZING FATE...",
      "UNVEILING TRUTHS..."
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % texts.length;
      setLoadingText(texts[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 relative">
      <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
        
        {/* Background Glow */}
        <MotionDiv 
          className="absolute inset-[-20px] bg-purple-600/20 rounded-full blur-2xl"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        {/* Outer Ring - Ancient Runes (Simulated with dashed border) */}
        <MotionDiv
          className="absolute inset-0 border-[3px] border-dashed border-purple-500/30 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Middle Ring - Reverse Rotation */}
        <MotionDiv
          className="absolute inset-2 border-2 border-t-purple-400 border-r-transparent border-b-purple-400 border-l-transparent rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />

        {/* Inner Ring - Fast Spin */}
        <MotionDiv
          className="absolute inset-6 border border-cyan-300/40 rounded-full"
          style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />

        {/* Core Eye/Orb */}
        <MotionDiv
          className="absolute w-8 h-8 bg-white/90 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)]"
          animate={{ 
            scale: [1, 1.3, 1], 
            opacity: [0.8, 1, 0.8],
            boxShadow: [
              "0 0 10px rgba(168,85,247,0.5)", 
              "0 0 30px rgba(168,85,247,0.9)", 
              "0 0 10px rgba(168,85,247,0.5)"
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Floating Particles */}
        <MotionDiv
           className="absolute w-1 h-1 bg-purple-200 rounded-full top-0"
           animate={{ y: [0, -40, 0], opacity: [0, 1, 0] }}
           transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
        />
        <MotionDiv
           className="absolute w-1 h-1 bg-cyan-200 rounded-full bottom-0"
           animate={{ y: [0, 40, 0], opacity: [0, 1, 0] }}
           transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        />
      </div>

      <div className="h-8 overflow-hidden relative w-full text-center">
        <MotionP
          key={loadingText}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-purple-200 font-heading text-xl tracking-[0.2em] uppercase drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
        >
          {loadingText}
        </MotionP>
      </div>
      
      {/* Progress Line */}
      <MotionDiv 
        className="mt-4 w-48 h-[1px] bg-purple-900/50 relative overflow-hidden"
      >
        <MotionDiv 
            className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-purple-400 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </MotionDiv>
    </div>
  );
};

export default LoadingOracle;