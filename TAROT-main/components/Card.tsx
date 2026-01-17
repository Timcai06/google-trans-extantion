import React, { useRef, useState, useMemo, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, useAnimation } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { DrawnCard } from '../types';

interface CardProps {
  card: DrawnCard;
  index: number;
  onHover: (rect: DOMRect | null) => void;
  onClick: () => void;
}

const MotionDiv = motion.div as any;
const MotionImg = motion.img as any;

// Ornate Border Overlay for Front of Card
const OrnateBorder: React.FC = () => (
    <svg 
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60 mix-blend-screen z-20" 
      viewBox="0 0 100 150" 
      preserveAspectRatio="none"
      style={{ transform: 'translateZ(10px)' }}
    >
        <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#d8b4fe" stopOpacity="0.8" />
            </linearGradient>
        </defs>
        {/* Outer Frame */}
        <rect x="2" y="2" width="96" height="146" rx="5" fill="none" stroke="url(#goldGrad)" strokeWidth="0.5" />
        <rect x="5" y="5" width="90" height="140" rx="3" fill="none" stroke="url(#goldGrad)" strokeWidth="0.2" />
        
        {/* Corners */}
        <path d="M 2 20 L 2 2 L 20 2" fill="none" stroke="url(#goldGrad)" strokeWidth="1" />
        <path d="M 98 20 L 98 2 L 80 2" fill="none" stroke="url(#goldGrad)" strokeWidth="1" />
        <path d="M 2 130 L 2 148 L 20 148" fill="none" stroke="url(#goldGrad)" strokeWidth="1" />
        <path d="M 98 130 L 98 148 L 80 148" fill="none" stroke="url(#goldGrad)" strokeWidth="1" />
    </svg>
);

// High-Fidelity Mystic Card Back
export const MysticCardBack: React.FC = () => (
  <div className="w-full h-full bg-[#0a0514] flex items-center justify-center overflow-hidden relative rounded-xl border-2 border-purple-500/30 shadow-[inset_0_0_30px_rgba(76,29,149,0.8)]">
    <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] via-[#0f0518] to-[#2e1065]"></div>
    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
    <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-purple-400/50 rounded-tl-lg"></div>
    <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-purple-400/50 rounded-tr-lg"></div>
    <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-purple-400/50 rounded-bl-lg"></div>
    <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-purple-400/50 rounded-br-lg"></div>
    
    {/* Inner decorative circle */}
    <div className="absolute inset-0 flex items-center justify-center opacity-40">
        <div className="w-24 h-24 border border-purple-400/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
        <div className="absolute w-20 h-20 border border-purple-400/20 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
    </div>

    <div className="absolute inset-3 border border-purple-400/20 rounded-lg"></div>
    
    <div className="relative z-10 w-20 h-20 flex items-center justify-center">
       <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-md animate-pulse"></div>
       <svg viewBox="0 0 100 100" className="w-14 h-14 text-purple-200 drop-shadow-[0_0_15px_rgba(216,180,254,0.8)]">
          <path d="M50 5 L95 50 L50 95 L5 50 Z" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-50" />
          <path d="M50 15 L85 50 L50 85 L15 50 Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="opacity-30" />
          <circle cx="50" cy="50" r="4" fill="currentColor" className="animate-[pulse_3s_ease-in-out_infinite]" />
       </svg>
    </div>
  </div>
);

const Card: React.FC<CardProps> = ({ card, index, onHover, onClick }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [justRevealed, setJustRevealed] = useState(false);
  
  // Animation Controls for Glitch Effect
  const imgControls = useAnimation();
  const overlayControls = useAnimation();
  const isHoveringRef = useRef(false);

  // Generate random landing angles and offsets
  const randomConfig = useMemo(() => {
     return {
        // Random tilt/rotation
        rotX: Math.random() * 8 - 4, 
        rotY: Math.random() * 10 - 5, 
        rotZ: Math.random() * 6 - 3,
        // Random Vertical Offset (Height Difference)
        yOffset: Math.random() * 30 - 15 
     };
  }, []);
  
  // Parallax Logic
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  
  const parallaxX = useSpring(useTransform(mouseX, [-1, 1], [25, -25]), springConfig);
  const parallaxY = useSpring(useTransform(mouseY, [-1, 1], [25, -25]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const xPct = (e.clientX - rect.left) / rect.width - 0.5;
      const yPct = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(xPct * 2); 
      mouseY.set(yPct * 2);
    }
  };

  // --- Dynamic Glitch Logic (Revised: Less Color Distortion) ---
  const triggerGlitch = async () => {
    if (!isHoveringRef.current) return;

    const isHeavy = Math.random() > 0.7; 
    const duration = isHeavy ? Math.random() * 0.1 + 0.05 : Math.random() * 0.3 + 0.1;

    // Reduced Physical Tremble 
    const x = (Math.random() - 0.5) * 1; 
    const y = (Math.random() - 0.5) * 1;

    // Visual Flicker - Focues on Brightness/Contrast, NOT Hue (Color)
    let filter = "";
    if (isHeavy) {
        // Subtle burst
        const bright = 1.0 + (Math.random() * 0.3); // Max 1.3 brightness
        const contrast = 1.0 + (Math.random() * 0.2); // Max 1.2 contrast
        // VERY subtle hue shift (almost unnoticeable)
        const hue = (Math.random() - 0.5) * 5; 
        filter = `brightness(${bright}) contrast(${contrast}) hue-rotate(${hue}deg)`;
    } else {
        // Tiny flicker
        const bright = 0.95 + (Math.random() * 0.1); 
        filter = `brightness(${bright}) contrast(1.02)`;
    }

    imgControls.start({
        x, y, filter,
        transition: { duration: duration, ease: "linear" }
    });

    // Subtle Overlay Flash
    if (isHeavy && Math.random() > 0.5) {
        overlayControls.start({
            opacity: Math.random() * 0.15, // Reduced max opacity
            x: (Math.random() - 0.5) * 5,
            transition: { duration: 0.05 }
        });
    } else {
        overlayControls.start({ opacity: 0, transition: { duration: 0.1 } });
    }

    const nextDelay = Math.random() * 200 + 50; 
    setTimeout(() => {
        if (isHoveringRef.current) triggerGlitch();
    }, duration * 1000 + nextDelay);
  };

  const resetGlitch = () => {
      imgControls.start({
          x: 0, y: 0, 
          filter: "brightness(1) contrast(1) hue-rotate(0deg)",
          transition: { duration: 0.3 }
      });
      overlayControls.start({ opacity: 0 });
  };

  const handleMouseEnter = () => {
    if (cardRef.current && !card.isRevealed) {
      onHover(cardRef.current.getBoundingClientRect());
    }
    
    if (card.isRevealed) {
        isHoveringRef.current = true;
        triggerGlitch();
    }
  };

  const handleMouseLeave = () => {
    onHover(null);
    mouseX.set(0);
    mouseY.set(0);
    
    isHoveringRef.current = false;
    resetGlitch();
  };

  const handleClick = () => {
      if (!card.isRevealed) {
          setJustRevealed(true);
          onClick();
          setTimeout(() => setJustRevealed(false), 2000); // Extended timeout for ripple effect
      }
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`relative w-32 h-48 md:w-48 md:h-72 perspective-1000 cursor-pointer group ${card.isRevealed ? 'cursor-default' : ''}`}
      style={{ zIndex: card.isRevealed ? 20 : 1 }}
    >
      {/* Shockwave / Ripple Effect on Reveal */}
      <AnimatePresence>
          {justRevealed && (
            <>
              {[0, 1, 2].map((i) => (
                <MotionDiv
                  key={`ripple-${i}`}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-300/60 z-50 pointer-events-none mix-blend-screen"
                  initial={{ width: 0, height: 0, opacity: 0.8, borderWidth: 4 }}
                  animate={{ 
                    width: 600 + (i * 100), 
                    height: 600 + (i * 100), 
                    opacity: 0, 
                    borderWidth: 0 
                  }}
                  transition={{ 
                    duration: 1.2, 
                    ease: "easeOut",
                    delay: i * 0.15 // Stagger the ripples
                  }}
                />
              ))}
              {/* Central Flash */}
              <MotionDiv 
                 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full blur-xl z-50 pointer-events-none"
                 initial={{ width: 0, height: 0, opacity: 1 }}
                 animate={{ width: 100, height: 100, opacity: 0 }}
                 transition={{ duration: 0.5 }}
              />
            </>
          )}
      </AnimatePresence>

      {/* Cosmic Aura / Glow behind the card */}
      {!card.isRevealed && (
          <div className="absolute inset-[-15px] rounded-xl bg-gradient-to-tr from-purple-600/0 via-purple-500/10 to-cyan-500/0 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse pointer-events-none"></div>
      )}
      
      {/* Revealed Glow */}
      {card.isRevealed && (
          <MotionDiv 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="absolute inset-[-30px] rounded-xl bg-purple-900/40 blur-3xl -z-10"
          ></MotionDiv>
      )}

      <MotionDiv
        className="w-full h-full relative"
        initial={{ rotateY: 180, rotateX: 0, rotateZ: 0, y: 50, opacity: 0, scale: 0.8 }}
        animate={{ 
          rotateY: card.isRevealed ? randomConfig.rotY : 180,
          rotateX: card.isRevealed ? randomConfig.rotX : 0, 
          rotateZ: card.isRevealed ? randomConfig.rotZ : 0,
          y: card.isRevealed ? randomConfig.yOffset : 0, // Apply Random Height Offset
          scale: card.isRevealed ? 1.1 : 1, 
          opacity: 1,
          z: card.isRevealed ? 50 : 0 
        }}
        whileHover={!card.isRevealed ? { 
            y: -25, 
            scale: 1.05,
            rotateZ: Math.random() * 2 - 1, 
            transition: { duration: 0.3, ease: "easeOut" }
        } : {}}
        transition={{ 
          rotateY: { duration: 1.2, type: 'spring', stiffness: 40, damping: 12 }, 
          rotateX: { duration: 1.2, type: 'spring', stiffness: 40, damping: 12 }, 
          rotateZ: { duration: 1.2, type: 'spring', stiffness: 40, damping: 12 }, 
          y: { duration: 0.8, ease: "easeInOut" },
          scale: { duration: 0.8, ease: "easeInOut" },
          z: { duration: 0.8 },
          opacity: { duration: 0.8, delay: index * 0.1 }
        }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* --- FRONT OF CARD (Revealed) --- */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden bg-[#120b29] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] border border-purple-500/20"
          style={{ 
              backfaceVisibility: 'hidden', 
              transform: 'rotateY(0deg)',
              transformStyle: 'preserve-3d', 
              overflow: 'hidden'
          }}
        >
          {card.imageUrl ? (
            <div className="w-full h-full relative" style={{ transformStyle: 'preserve-3d' }}>
                <MotionDiv
                  style={{
                    x: parallaxX,
                    y: parallaxY,
                    z: 30, 
                    rotate: card.isReversed ? 180 : 0,
                  }}
                  className="w-full h-full absolute inset-0"
                >
                  <MotionImg 
                    src={card.imageUrl} 
                    alt={card.name} 
                    className="w-full h-full object-cover"
                    style={{
                      scale: 1.15, 
                      imageRendering: 'pixelated'
                    }}
                    animate={imgControls}
                  />

                  <MotionDiv 
                    className="absolute inset-0 bg-purple-500 mix-blend-color-dodge pointer-events-none"
                    animate={overlayControls}
                    initial={{ opacity: 0 }}
                  />
                </MotionDiv>
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0518] via-transparent to-transparent opacity-90 pointer-events-none" style={{ transform: 'translateZ(2px)' }}></div>
                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-screen pointer-events-none" style={{ transform: 'translateZ(2px)' }}></div>
                
                <OrnateBorder />
            </div>
          ) : (
             <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f0518] relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black animate-pulse"></div>
                
                {card.isGeneratingImage ? (
                  <div className="flex flex-col items-center gap-4 z-10">
                     <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-2 border-t-purple-400 border-r-transparent border-b-purple-400 border-l-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-2 border-2 border-t-transparent border-r-purple-300 border-b-transparent border-l-purple-300 rounded-full animate-spin-reverse"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-purple-100 rounded-full shadow-[0_0_10px_white] animate-pulse"></div>
                        </div>
                     </div>
                     <span className="text-[10px] text-purple-200/80 font-heading tracking-[0.25em] animate-pulse">SUMMONING</span>
                  </div>
                ) : (
                  <span className="text-xs text-red-400/50 font-mono tracking-widest">VOID</span>
                )}
             </div>
          )}
          
          <MotionDiv 
             initial={{ opacity: 0 }}
             animate={{ opacity: card.isRevealed ? 1 : 0 }}
             transition={{ delay: 0.4, duration: 0.5 }}
             className="absolute bottom-0 w-full pt-6 pb-4 px-4 text-center bg-gradient-to-t from-[#0a0514] via-[#0a0514]/90 to-transparent pointer-events-none"
             style={{ transform: 'translateZ(40px)' }}
          >
            <h3 className="text-purple-50 font-heading text-lg font-bold tracking-[0.15em] uppercase truncate drop-shadow-[0_2px_4px_rgba(0,0,0,1)] border-b border-purple-500/20 pb-1 mb-1 mx-2">
              {card.name}
            </h3>
            <div className="flex flex-col items-center justify-center">
                 <span className="text-[10px] text-purple-300 font-serif italic tracking-widest uppercase opacity-80">{card.position}</span>
                 
                 {card.isReversed && (
                     <div className="mt-2 flex items-center gap-1 px-3 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 shadow-[0_0_10px_rgba(220,38,38,0.4)]">
                        <RotateCcw className="w-3 h-3 text-red-400" />
                        <span className="text-[9px] text-red-200 font-heading tracking-widest font-bold">
                             REVERSED
                        </span>
                     </div>
                 )}
            </div>
          </MotionDiv>

          <MotionDiv 
            className="absolute inset-0 bg-white mix-blend-overlay pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: card.isRevealed ? [0, 0.8, 0] : 0 }}
            transition={{ duration: 0.4, times: [0, 0.1, 1], delay: 0.1 }}
            style={{ transform: 'translateZ(50px)' }}
          />
        </div>

        <div 
          className="absolute inset-0 w-full h-full backface-hidden shadow-2xl transition-all duration-300"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className={`w-full h-full rounded-xl transition-all duration-500 ${!card.isRevealed ? 'group-hover:shadow-[0_0_40px_rgba(169,121,255,0.4)] group-hover:border-purple-300/50' : ''}`}>
             <MysticCardBack />
          </div>
        </div>
      </MotionDiv>
    </div>
  );
};

export default Card;