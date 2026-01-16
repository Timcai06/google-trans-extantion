import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionPath = motion.path as any;
const MotionDiv = motion.div as any;
const MotionG = motion.g as any;

const PixelCat: React.FC = () => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [glitch, setGlitch] = useState(false);

  // Random Blink Logic
  useEffect(() => {
    const blinkLoop = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
      const nextBlink = Math.random() * 3000 + 2000;
      setTimeout(blinkLoop, nextBlink);
    };
    const timer = setTimeout(blinkLoop, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Interaction Handler
  const handleClick = () => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 300);

    const messages = [
      "Meow.",
      "The void is cozy.",
      "Rest with me.",
      "Staring at stars...",
      "Purrr...",
      "Dreaming of fate...",
      "Are you lost?",
      "Do not fear.",
      "Feed me pixels.",
      "Nice cards."
    ];
    
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    setMessage(randomMsg);
    
    // Auto hide message
    setTimeout(() => setMessage(null), 3000);
  };

  // Colors
  const bodyColor = "#2e2045"; // Deep violet body
  const highlightColor = "#a855f7"; // Bright purple outline/rim
  const eyeColor = "#22d3ee"; // Cyan eyes
  const tailColor = "#f0abfc"; // Neon tail

  return (
    <div className="relative group cursor-pointer" onClick={handleClick}>
      
      {/* Speech Bubble */}
      <AnimatePresence>
        {message && (
          <MotionDiv
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-full right-0 mb-4 px-3 py-2 bg-[#0f0518] border border-purple-500/50 rounded-lg whitespace-nowrap z-50 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
          >
            <p className="font-mono text-[10px] text-purple-200 tracking-wider">
               {message}
            </p>
            {/* Triangle tail for bubble */}
            <div className="absolute top-full right-4 w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-purple-500/50 border-r-[6px] border-r-transparent"></div>
            <div className="absolute top-full right-4 w-0 h-0 border-l-[4px] border-l-transparent border-t-[4px] border-t-[#0f0518] border-r-[4px] border-r-transparent mt-[-1px]"></div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Front View Lying (Loaf) Cat SVG */}
      <svg 
        width="64" 
        height="64" 
        viewBox="0 0 32 32" 
        className={`drop-shadow-[0_0_15px_rgba(168,85,247,0.6)] transition-all duration-100 ${glitch ? 'translate-x-[2px] opacity-80 filter brightness-150' : ''}`}
        style={{ imageRendering: 'pixelated' }}
      >
        <defs>
            <filter id="bodyGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
                <feFlood floodColor="#a855f7" floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        {/* Shadow Base */}
        <ellipse cx="16" cy="28" rx="12" ry="3" fill="rgba(168,85,247,0.4)" className="animate-pulse" />

        {/* --- TAIL (Curling around/behind) --- */}
        <MotionPath
          stroke={tailColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          filter="drop-shadow(0 0 4px #d946ef)"
          d="M 26 24 Q 30 22 28 16"
          animate={{
             d: [
               "M 26 24 Q 30 22 28 16", // Relaxed
               "M 26 24 Q 32 23 29 19", // Flick up
               "M 26 24 Q 29 18 31 15", // High
               "M 26 24 Q 30 22 28 16"  // Back
             ]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* --- BODY (Lying Down / Loaf) --- */}
        <MotionG
            animate={{ y: [0, 0.5, 0] }} // Subtle body breathing
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            filter="url(#bodyGlow)"
        >
            {/* Body Mass */}
            <rect x="6" y="19" width="20" height="9" rx="3" fill={bodyColor} stroke={highlightColor} strokeWidth="0.5" strokeOpacity="0.3" />
            
            {/* Tucked Front Paws (Suggested) */}
            <path d="M10 27 L14 27 L14 25 L10 25 Z" fill="#4c1d95" opacity="0.8" />
            <path d="M18 27 L22 27 L22 25 L18 25 Z" fill="#4c1d95" opacity="0.8" />
            
            {/* Cyber Highlights Body */}
            <path d="M7 21 h2" stroke={highlightColor} strokeWidth="1" opacity="0.4" />
            <path d="M23 21 h2" stroke={highlightColor} strokeWidth="1" opacity="0.4" />
        </MotionG>

        {/* --- HEAD (Front Facing, Lower) --- */}
        <MotionG
            animate={{ y: [0, 1, 0] }} // Head bob
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            filter="url(#bodyGlow)"
        >
            {/* Ears */}
            <path d="M8 11 L11 11 L11 6 L7 2 Z" fill={bodyColor} stroke={highlightColor} strokeWidth="0.5" strokeOpacity="0.3" /> 
            <path d="M21 11 L24 11 L21 6 L25 2 Z" fill={bodyColor} stroke={highlightColor} strokeWidth="0.5" strokeOpacity="0.3" /> 
            
            {/* Ear Inner Highlights */}
            <path d="M8 3 L10 6" stroke={highlightColor} strokeWidth="1" opacity="0.8" />
            <path d="M24 3 L22 6" stroke={highlightColor} strokeWidth="1" opacity="0.8" />

            {/* Head Shape */}
            <rect x="8" y="9" width="16" height="12" rx="3" fill={bodyColor} />
            
            {/* Forehead Rune */}
            <path d="M16 10 v2 M15 11 h2" stroke="#4c1d95" strokeWidth="1.5" />

            {/* --- FACE --- */}
            
            {/* Eyes */}
            {!isBlinking ? (
                <>
                  <rect x="10" y="13" width="3" height="3" fill={eyeColor} className="drop-shadow-[0_0_4px_#22d3ee]" />
                  <rect x="12" y="13" width="1" height="1" fill="white" />
                  
                  <rect x="19" y="13" width="3" height="3" fill={eyeColor} className="drop-shadow-[0_0_4px_#22d3ee]" />
                  <rect x="21" y="13" width="1" height="1" fill="white" />
                </>
            ) : (
                <>
                  <rect x="10" y="14" width="3" height="1" fill="#6b7280" />
                  <rect x="19" y="14" width="3" height="1" fill="#6b7280" />
                </>
            )}

            {/* Nose */}
            <rect x="15" y="16" width="2" height="1" fill="#f0abfc" />
            
            {/* Mouth */}
            <path d="M15 17 v1 h-1" fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.5"/>
            <path d="M17 17 v1 h1" fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.5"/>

            {/* Whiskers */}
            <line x1="7" y1="15" x2="5" y2="14" stroke="#a855f7" strokeWidth="0.5" opacity="0.6" />
            <line x1="7" y1="17" x2="5" y2="18" stroke="#a855f7" strokeWidth="0.5" opacity="0.6" />
            
            <line x1="25" y1="15" x2="27" y2="14" stroke="#a855f7" strokeWidth="0.5" opacity="0.6" />
            <line x1="25" y1="17" x2="27" y2="18" stroke="#a855f7" strokeWidth="0.5" opacity="0.6" />

            {/* Outline Highlights */}
            <path d="M9 9 h14" fill="none" stroke={highlightColor} strokeWidth="1" opacity="0.4" />
            <rect x="9" y="9" width="1" height="1" fill="#fff" opacity="0.6" />

        </MotionG>

      </svg>
    </div>
  );
};

export default PixelCat;