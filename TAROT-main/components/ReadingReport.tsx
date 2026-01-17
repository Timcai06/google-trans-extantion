import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw, Sparkles, Moon, Sun, Star, Compass, Zap, Quote, 
  Sword, Shield, Eye, Feather, Gem, Scroll
} from 'lucide-react';

interface ReadingReportProps {
  reading: string;
  onReset: () => void;
}

const MotionDiv = motion.div as any;

// Floating Magic Particle Component
const MagicParticle: React.FC<{ delay: number }> = ({ delay }) => (
  <MotionDiv
    className="absolute bg-purple-200 rounded-full blur-[1px]"
    style={{
      width: Math.random() * 3 + 1 + 'px',
      height: Math.random() * 3 + 1 + 'px',
      left: Math.random() * 100 + '%',
      bottom: '-10px'
    }}
    animate={{
      y: -600,
      opacity: [0, 0.6, 0],
      x: [0, Math.random() * 60 - 30]
    }}
    transition={{
      duration: Math.random() * 4 + 6,
      repeat: Infinity,
      delay: delay,
      ease: "linear"
    }}
  />
);

// New: Background Rune/Symbol Animation
const FloatingSymbol: React.FC<{ icon: any, x: string, y: string, size: number, delay: number, reverse?: boolean }> = ({ icon: Icon, x, y, size, delay, reverse }) => (
  <MotionDiv
    className="absolute text-purple-900/20 pointer-events-none"
    style={{ left: x, top: y }}
    initial={{ opacity: 0 }}
    animate={{ 
      opacity: [0.05, 0.15, 0.05], 
      rotate: reverse ? -360 : 360,
      scale: [1, 1.1, 1]
    }}
    transition={{
      opacity: { duration: 5, repeat: Infinity, delay },
      rotate: { duration: 40, repeat: Infinity, ease: "linear" },
      scale: { duration: 10, repeat: Infinity, ease: "easeInOut" }
    }}
  >
     <Icon size={size} />
  </MotionDiv>
);

// Mystic Circle SVG
const MysticCircle: React.FC = () => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10 animate-[spin_60s_linear_infinite]" viewBox="0 0 500 500">
        <circle cx="250" cy="250" r="200" fill="none" stroke="currentColor" strokeWidth="1" className="text-purple-500" strokeDasharray="10 10" />
        <circle cx="250" cy="250" r="180" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-purple-400" />
        <path d="M250 50 L250 450 M50 250 L450 250" stroke="currentColor" strokeWidth="0.5" className="text-purple-300" />
        <rect x="175" y="175" width="150" height="150" fill="none" stroke="currentColor" strokeWidth="1" className="text-purple-500" transform="rotate(45 250 250)" />
    </svg>
);

const ReadingReport: React.FC<ReadingReportProps> = ({ reading, onReset }) => {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    setParticles(Array.from({ length: 20 }).map((_, i) => i * 0.3));
  }, []);

  // Helper to map Action Guide keywords to SVGs
  const getIconForActionItem = (text: string) => {
    if (text.includes('行动') || text.includes('斩断')) return <Sword className="w-4 h-4 text-amber-300" />;
    if (text.includes('避坑') || text.includes('守护')) return <Shield className="w-4 h-4 text-red-300" />;
    if (text.includes('心法') || text.includes('觉知')) return <Eye className="w-4 h-4 text-blue-300" />;
    if (text.includes('能量') || text.includes('仪式')) return <Gem className="w-4 h-4 text-purple-300" />;
    return <Feather className="w-4 h-4 text-purple-200" />;
  };

  // Advanced Parser
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const trimmedLine = line.trim();

      // --- H2: Main Section Headers ---
      if (trimmedLine.startsWith('## ')) {
        let content = trimmedLine.replace('## ', '').trim();
        
        let Icon = Star;
        if (content.includes('星辰') || content.includes('启示')) Icon = Sparkles;
        else if (content.includes('往昔') || content.includes('过去')) Icon = Moon;
        else if (content.includes('当下') || content.includes('现在')) Icon = Sun;
        else if (content.includes('未来') || content.includes('回响')) Icon = Compass;
        else if (content.includes('现实') || content.includes('行动') || content.includes('指南')) Icon = Zap;
        else if (content.includes('命运') || content.includes('箴言')) Icon = Scroll;

        // Check for Reversed in header
        const isReversedHeader = content.includes('逆位');
        const isActionSection = content.includes('现实') || content.includes('行动');
        
        const headerColor = isActionSection ? 'text-amber-200' : isReversedHeader ? 'text-red-200' : 'text-purple-100';
        const iconColor = isActionSection ? 'text-amber-300' : isReversedHeader ? 'text-red-400' : 'text-purple-300';
        const borderColor = isActionSection ? 'border-amber-400/30' : isReversedHeader ? 'border-red-500/30' : 'border-purple-400/30';
        const bgColor = isActionSection ? 'bg-amber-900/20' : isReversedHeader ? 'bg-red-900/10' : 'bg-purple-900/20';

        return (
          <div key={i} className="mt-12 mb-6 flex items-center gap-3 relative group">
            <div className={`p-2 rounded-full border ${borderColor} ${bgColor} shadow-[0_0_10px_rgba(0,0,0,0.3)] transition-all duration-500 group-hover:scale-110`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <h3 className={`text-2xl md:text-3xl font-heading ${headerColor} tracking-wide drop-shadow-sm flex items-center gap-2`}>
              {content.split(/(\(.*\))/).map((part, idx) => {
                 if (part.includes('逆位')) {
                     return <span key={idx} className="text-red-300 text-lg font-sans font-bold uppercase tracking-wider border border-red-500/30 px-2 py-0.5 rounded-full bg-red-950/30 flex items-center gap-1"><RotateCcw size={12}/> {part.replace('(','').replace(')','')}</span>
                 }
                 if (part.includes('正位')) {
                     return <span key={idx} className="text-purple-300/60 text-lg font-sans tracking-wider px-2 py-0.5">{part.replace('(','').replace(')','')}</span>
                 }
                 return part;
              })}
            </h3>
            <div className={`flex-grow h-[1px] bg-gradient-to-r from-${isActionSection ? 'amber' : isReversedHeader ? 'red' : 'purple'}-500/30 to-transparent ml-4`}></div>
          </div>
        );
      }

      // --- H3: Sub Headers (Keywords, Deep Dive) ---
      if (trimmedLine.startsWith('### ')) {
          const content = trimmedLine.replace('### ', '').trim();
          return (
              <div key={i} className="mt-6 mb-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rotate-45"></div>
                  <h4 className="text-sm font-heading font-bold uppercase tracking-[0.2em] text-purple-300/80">
                      {content}
                  </h4>
              </div>
          );
      }

      // --- Blockquotes (>) ---
      if (trimmedLine.startsWith('> ')) {
          const content = trimmedLine.replace('> ', '').trim();
          return (
              <div key={i} className="my-6 relative px-8 py-4 text-center">
                  <Quote className="absolute top-0 left-4 w-6 h-6 text-purple-600/40 transform -scale-x-100" />
                  <p className="font-serif italic text-lg md:text-xl text-purple-200 leading-relaxed drop-shadow-[0_2px_10px_rgba(168,85,247,0.2)]">
                      {content}
                  </p>
                  <Quote className="absolute bottom-0 right-4 w-6 h-6 text-purple-600/40" />
                  <div className="absolute inset-0 border-y border-purple-500/10 -z-10 bg-purple-500/5 rounded-lg"></div>
              </div>
          );
      }
      
      // --- List Items (-) ---
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const content = trimmedLine.replace(/^[-*]\s+/, '');
        const parts = content.split(/(\*\*.*?\*\*|：)/g); // Split by bold or colon to find keys
        
        // Check if this is a special action item
        let ActionIcon = null;
        if (content.includes('建议') || content.includes('行动')) ActionIcon = getIconForActionItem('行动');
        else if (content.includes('指南') || content.includes('避坑')) ActionIcon = getIconForActionItem('避坑');
        else if (content.includes('心法') || content.includes('觉知')) ActionIcon = getIconForActionItem('心法');
        else if (content.includes('仪式') || content.includes('能量')) ActionIcon = getIconForActionItem('能量');

        return (
           <div key={i} className="flex gap-3 ml-2 md:ml-4 mb-3 items-start p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-purple-500/10 group/item">
              <div className="mt-1.5 flex-shrink-0">
                  {ActionIcon ? (
                      <div className="p-1.5 rounded bg-purple-950/50 border border-purple-500/20 group-hover/item:border-purple-400/50 transition-colors">
                          {ActionIcon}
                      </div>
                  ) : (
                      <span className="block w-1.5 h-1.5 rounded-full bg-purple-400/80 shadow-[0_0_5px_rgba(168,85,247,0.5)] mt-1.5"></span>
                  )}
              </div>
              <p className="text-sm md:text-base text-purple-100/90 font-light leading-relaxed">
                {parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return (
                            <span key={j} className="text-amber-100 font-semibold mx-0.5 tracking-wide">
                                {part.slice(2, -2)}
                            </span>
                        );
                    }
                    return part;
                })}
              </p>
           </div>
        );
      }

      if (trimmedLine === '') return <div key={i} className="h-2"></div>;
      
      // --- Standard Paragraphs ---
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="text-sm md:text-lg leading-loose text-purple-100/80 mb-4 font-light tracking-wide text-justify">
          {parts.map((part, j) => {
             if (part.startsWith('**') && part.endsWith('**')) {
                 return (
                    <span key={j} className="relative inline-block text-purple-50 font-medium px-1 mx-0.5">
                        <span className="absolute inset-x-0 bottom-1 h-[6px] bg-purple-600/40 -z-10 rounded-sm"></span>
                        {part.slice(2, -2)}
                    </span>
                 );
             }
             return part;
          })}
        </p>
      );
    });
  };

  // Icon mapping for header import check
  const RotateCcw: React.FC<{size?: number}> = ({size}) => (
      <svg width={size||16} height={size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
  );

  return (
    <MotionDiv
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="w-full max-w-4xl mx-auto mt-8 mb-16 relative"
    >
      {/* Container: Glassmorphism + Parchment Feel */}
      <div className="relative rounded-lg overflow-hidden backdrop-blur-xl bg-[#0f0518]/90 border border-purple-500/30 shadow-[0_0_50px_rgba(88,28,135,0.3)]">
          
          {/* Breathing Background Light */}
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/10 via-transparent to-indigo-900/10 animate-[pulse_5s_infinite]"></div>

          {/* Mystic Circle Overlay (Center) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none overflow-hidden">
             <div className="w-[800px] h-[800px]">
                <MysticCircle />
             </div>
          </div>

          {/* Flowing Fog Layers */}
          <MotionDiv 
             className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-screen pointer-events-none"
             animate={{ rotate: 360 }}
             transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          />

          {/* Subtle Texture Overlay */}
          <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay"></div>
          
          {/* Background Animations (Runes/Symbols) */}
          <FloatingSymbol icon={Compass} x="10%" y="20%" size={120} delay={0} />
          <FloatingSymbol icon={Star} x="85%" y="60%" size={80} delay={2} reverse />
          <FloatingSymbol icon={Moon} x="5%" y="80%" size={60} delay={4} />

          {/* Top Decorative Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500/60 to-transparent"></div>

          {/* Inner Magic Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
             {particles.map((delay, idx) => (
                 <MagicParticle key={idx} delay={delay} />
             ))}
          </div>

          <div className="relative z-10 p-6 md:p-12">
            <div className="prose prose-invert max-w-none font-serif">
               {renderContent(reading)}
            </div>
          </div>

          {/* Bottom Actions: Mystic Button */}
          <div className="relative z-10 p-8 pt-0 flex justify-center pb-12">
            <button
              onClick={onReset}
              className="group relative px-12 py-4 cursor-pointer focus:outline-none"
            >
              {/* Button Background Layers */}
              <div className="absolute inset-0 bg-[#1a0b2e] border-2 border-purple-500/30 rounded-lg transform skew-x-[-10deg] group-hover:skew-x-[-5deg] transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.2)] group-hover:shadow-[0_0_40px_rgba(168,85,247,0.5)]"></div>
              <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg transform skew-x-[-10deg] group-hover:skew-x-[-5deg]"></div>
              
              {/* Content */}
              <div className="relative flex items-center gap-3 z-10">
                <RefreshCw className="w-5 h-5 text-purple-300 group-hover:text-white group-hover:rotate-180 transition-all duration-700" />
                <span className="font-heading tracking-[0.25em] text-sm text-purple-200 group-hover:text-white uppercase group-hover:tracking-[0.35em] transition-all duration-300">
                   Consult Again
                </span>
              </div>

              {/* Decorative Corners */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-purple-400 group-hover:border-white transition-colors"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-purple-400 group-hover:border-white transition-colors"></div>
            </button>
          </div>
          
          {/* Bottom Decorative Line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500/60 to-transparent"></div>
      </div>
    </MotionDiv>
  );
};

export default ReadingReport;