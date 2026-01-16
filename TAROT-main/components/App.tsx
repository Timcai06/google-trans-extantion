import React, { useState, useEffect } from 'react';
import StarryBackground from './components/StarryBackground';
import Card, { MysticCardBack } from './components/Card';
import IntroCard from './components/IntroCard';
import ReadingReport from './components/ReadingReport';
import LoadingOracle from './components/LoadingOracle';
import { DrawnCard, GameState } from './types';
import { getRandomCards } from './constants';
import { generateReading } from './services/readingService';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;
const MotionSpan = motion.span as any;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [reading, setReading] = useState<string>('');
  const [gatheringPoint, setGatheringPoint] = useState<{ x: number, y: number } | null>(null);

  const startReading = () => {
    setGameState('shuffling');
    setGatheringPoint(null); // Reset gathering point on click

    // Duration of the "Wizard Shuffle"
    const shuffleDuration = 4500; // Increased time for new animation

    setTimeout(() => {
      const cards = getRandomCards(3).map((c, i) => ({
        ...c,
        isReversed: Math.random() < 0.5, // 50% chance of reversal (True random coin toss)
        position: i === 0 ? 'Past' : i === 1 ? 'Present' : 'Future',
        isGeneratingImage: true,
        isRevealed: false
      })) as DrawnCard[];
      
      setDrawnCards(cards);
      setGameState('selecting');

      // Remove image generation code - we'll handle images later
      // For now, just mark images as not generating
      setDrawnCards(cards.map(card => ({
        ...card,
        isGeneratingImage: false
      })));

    }, shuffleDuration);
  };

  const handleCardHover = (rect: DOMRect | null) => {
    if (rect) {
      setGatheringPoint({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    } else {
      setGatheringPoint(null);
    }
  };

  const handleCardClick = (index: number) => {
    if (gameState !== 'selecting') return;

    setDrawnCards(prev => {
      const newCards = [...prev];
      if (!newCards[index].isRevealed) {
        newCards[index].isRevealed = true;
      }
      return newCards;
    });
  };

  // Effect to check if all cards are revealed
  useEffect(() => {
    if (gameState === 'selecting' && drawnCards.length === 3) {
      const allRevealed = drawnCards.every(c => c.isRevealed);
      if (allRevealed) {
        // All cards flipped, start generating report
        setGameState('processing_report');
        generateReport();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnCards, gameState]);

  const generateReport = async () => {
    // Artificial delay for effect if generation is too fast, allow user to see the oracle animation
    const minDelayPromise = new Promise(resolve => setTimeout(resolve, 3000));
    const reportPromise = generateReading(drawnCards);

    const [result] = await Promise.all([reportPromise, minDelayPromise]);
    setReading(result);
    setGameState('done');
  };

  const resetGame = () => {
    setGameState('intro');
    setDrawnCards([]);
    setReading('');
  };

  // Typewriter effect container
  const sentence = "When the stars align, the veil lifts. Ask the void, and receive its truth.";
  const words = sentence.split(" ");

  return (
    <div className="min-h-screen text-purple-100 relative overflow-x-hidden selection:bg-purple-900 selection:text-white flex flex-col">
      <StarryBackground gatheringPoint={gatheringPoint} />

      {/* Prominent CRT Channel Indicator */}
      <div className="fixed bottom-8 right-8 z-50 pointer-events-none hidden md:block">
         <div className="relative group">
            {/* Glow Box */}
            <div className="absolute -inset-2 bg-green-500/20 blur-md rounded-lg opacity-70 animate-pulse"></div>
            
            {/* OSD (On Screen Display) Style Text */}
            <div className="relative px-4 py-2 border border-green-500/50 bg-black/80 rounded flex items-center gap-3 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-[pulse_1s_infinite] shadow-[0_0_10px_#22c55e]"></div>
                <div className="flex flex-col items-end leading-none">
                    <span className="font-mono text-[10px] text-green-700 font-bold uppercase tracking-wider mb-0.5">SIGNAL</span>
                    <span className="font-mono text-lg text-green-400 font-bold tracking-[0.2em] drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]" style={{ textShadow: '2px 0px 0px rgba(255,0,0,0.5), -2px 0px 0px rgba(0,0,255,0.5)' }}>
                       CRT
                    </span>
                </div>
            </div>
         </div>
      </div>

      {/* Adjusted padding and alignment to shift visual center upwards */}
      <main className="container mx-auto px-4 pt-10 pb-20 min-h-screen flex flex-col items-center relative z-10">
        
        {/* Header - Reduced Margins */}
        <header className="mb-4 md:mb-8 text-center flex-shrink-0 z-20">
          <h1 className="text-4xl md:text-6xl font-heading text-transparent bg-clip-text bg-gradient-to-br from-purple-200 via-purple-100 to-indigo-200 drop-shadow-[0_0_25px_rgba(168,85,247,0.5)] tracking-wide">
            Mystic Tarot
          </h1>
          <div className="h-[1px] w-24 mx-auto bg-gradient-to-r from-transparent via-purple-400/50 to-transparent my-4"></div>
          
          {/* Intro Text - Typewriter Style */}
          <AnimatePresence>
            {gameState === 'intro' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 max-w-lg mx-auto text-center h-20"
              >
                  <p className="text-purple-200/90 font-mono text-base md:text-lg leading-relaxed tracking-wider drop-shadow-md">
                    {words.map((word, i) => (
                      <MotionSpan
                        key={i}
                        initial={{ opacity: 0, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.5, delay: i * 0.15 }}
                        className="inline-block mr-2"
                      >
                        {word}
                      </MotionSpan>
                    ))}
                  </p>
                  
                  {/* Blinking Cursor */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: words.length * 0.15 + 0.5 }}
                    className="mt-4 flex justify-center gap-3 opacity-30"
                  >
                      <span className="w-16 h-[1px] bg-purple-400 animate-[pulse_2s_infinite]"></span>
                  </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Content Area - Flex grow to fill space, but content is naturally higher due to header change */}
        <div className="flex-grow flex flex-col items-center w-full max-w-6xl mt-4">
          <AnimatePresence mode="wait">
            
            {/* Intro State */}
            {gameState === 'intro' && (
              <IntroCard onClick={startReading} onHover={handleCardHover} key="intro" />
            )}

            {/* Shuffling State - Rich Divining Fate Animation */}
            {gameState === 'shuffling' && (
               <MotionDiv
                  key="shuffling"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
                  transition={{ duration: 0.5 }}
                  className="relative w-full h-[500px] flex items-center justify-center perspective-1000"
                  style={{ perspective: '1000px' }}
               >
                  {/* Central Energy Core */}
                  <MotionDiv 
                    className="absolute w-20 h-20 rounded-full bg-white z-0 blur-xl"
                    animate={{ 
                      scale: [1, 2, 1], 
                      opacity: [0.3, 0.7, 0.3],
                      background: ["#a855f7", "#ffffff", "#a855f7"] 
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />

                  {/* Outer Rune Ring */}
                  <MotionDiv
                    className="absolute w-[450px] h-[450px] border border-purple-500/20 rounded-full border-dashed"
                    animate={{ rotate: 360, scale: [0.9, 1, 0.9] }}
                    transition={{ duration: 20, ease: "linear", repeat: Infinity }}
                  />
                  <MotionDiv
                    className="absolute w-[350px] h-[350px] border border-purple-400/30 rounded-full border-dotted"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, ease: "linear", repeat: Infinity }}
                  />

                  {/* Orbiting Cards */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <MotionDiv
                      key={i}
                      className="absolute w-24 h-36 md:w-28 md:h-44 origin-center"
                      initial={{ 
                        opacity: 0, 
                        rotateY: 0, 
                        z: -500 
                      }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        // Orbit path calculation: spiral in or out
                        rotate: [0, 360], 
                        rotateY: [0, 180, 360],
                        x: [
                            Math.cos(i * (Math.PI / 4)) * 300, 
                            Math.cos(i * (Math.PI / 4) + Math.PI) * 50
                        ],
                        y: [
                            Math.sin(i * (Math.PI / 4)) * 300, 
                            Math.sin(i * (Math.PI / 4) + Math.PI) * 50
                        ],
                        scale: [0.5, 1, 0],
                      }}
                      transition={{
                        duration: 4,
                        delay: i * 0.2,
                        ease: "easeInOut",
                      }}
                    >
                         <div className="w-full h-full transform transition-transform duration-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                           <MysticCardBack />
                         </div>
                    </MotionDiv>
                  ))}
                  
                  {/* Text Overlay */}
                  <div className="absolute z-30 flex flex-col items-center">
                       <MotionDiv 
                         className="font-heading text-purple-100 text-2xl tracking-[0.5em] drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                         animate={{ opacity: [0.5, 1, 0.5], textShadow: ["0 0 5px #a855f7", "0 0 20px #a855f7", "0 0 5px #a855f7"] }}
                         transition={{ duration: 1.5, repeat: Infinity }}
                       >
                         DIVINING FATE
                       </MotionDiv>
                       <span className="text-xs text-purple-300 font-mono tracking-widest mt-2">ACCESSING THE VOID</span>
                  </div>
               </MotionDiv>
            )}

            {/* Selecting / Processing / Done States */}
            {(gameState === 'selecting' || gameState === 'processing_report' || gameState === 'done') && (
              <MotionDiv
                key="active-game"
                className="w-full flex flex-col items-center"
              >
                {/* Cards Container - Reduced margin bottom to keep centered */}
                <div className="flex flex-col md:flex-row flex-wrap justify-center gap-6 md:gap-16 mb-8 perspective-1000">
                  {drawnCards.map((card, index) => (
                    <Card
                      key={card.id}
                      card={card}
                      index={index}
                      onHover={handleCardHover}
                      onClick={() => handleCardClick(index)}
                    />
                  ))}
                </div>

                {/* Processing State - Loading Oracle */}
                {gameState === 'processing_report' && (
                   <MotionDiv 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -20 }}
                   >
                     <LoadingOracle />
                   </MotionDiv>
                )}

                {/* Final Report */}
                {gameState === 'done' && (
                  <ReadingReport reading={reading} onReset={resetGame} />
                )}
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
};

export default App;