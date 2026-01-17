import React, { useEffect, useRef } from 'react';
import { Particle } from '../types';

interface StarryBackgroundProps {
  gatheringPoint: { x: number; y: number } | null;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  active: boolean;
}

// Pre-render a glowing particle sprite for performance
const createGlowSprite = () => {
  const canvas = document.createElement('canvas');
  const size = 64; // High res sprite
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const center = size / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  
  // Core: White/Bright Purple
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  // Inner Glow: Mystic Purple
  gradient.addColorStop(0.15, 'rgba(216, 180, 254, 0.9)'); 
  // Outer Glow: Deep Purple fading out
  gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.3)');
  gradient.addColorStop(1, 'rgba(147, 51, 234, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center, center, center, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas;
};

const StarryBackground: React.FC<StarryBackgroundProps> = ({ gatheringPoint }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const gatheringPointRef = useRef<{ x: number; y: number } | null>(null);
  const prevGatheringRef = useRef<{ x: number; y: number } | null>(null);
  const spriteRef = useRef<HTMLCanvasElement | null>(null);
  
  // Shooting Star Ref
  const shootingStarRef = useRef<ShootingStar>({ x: 0, y: 0, vx: 0, vy: 0, life: 0, active: false });

  // Initialize Glow Sprite once
  useEffect(() => {
    spriteRef.current = createGlowSprite();
  }, []);

  // Sync prop to ref and handle "Pop" impulse
  useEffect(() => {
    if (prevGatheringRef.current && !gatheringPoint) {
      const center = prevGatheringRef.current;
      const particles = particlesRef.current;
      // Apply explosive force to existing particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const distSq = dx * dx + dy * dy;
        
        // Explosion Range
        if (distSq < 360000) { 
          const angle = Math.atan2(dy, dx);
          const push = (Math.random() * 5) + 5; 
          p.vx += Math.cos(angle) * push;
          p.vy += Math.sin(angle) * push;
        }
      }
    }
    
    prevGatheringRef.current = gatheringPoint;
    gatheringPointRef.current = gatheringPoint;
  }, [gatheringPoint]);

  // Main Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); 
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particlesRef.current = [];
      const density = 6000; 
      const numberOfParticles = (canvas.width * canvas.height) / density;
      
      for (let i = 0; i < numberOfParticles; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const angle = Math.random() * Math.PI * 2;
        // Base drift speed for "always moving" effect
        const speed = 0.05 + Math.random() * 0.1; 

        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed, 
          vy: Math.sin(angle) * speed,
          radius: Math.random() < 0.8 ? Math.random() * 1.5 + 0.5 : Math.random() * 2.5 + 1.5,
          baseX: x, 
          baseY: y,
          density: (Math.random() * 20) + 1,
          baseAlpha: Math.random() * 0.6 + 0.2, 
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    handleResize();

    // --- OPTIMIZATION CONSTANTS ---
    const maxConnDist = 130; 
    const maxConnDistSq = maxConnDist * maxConnDist;
    const maxMouseConnDist = 220;
    const spotlightRadius = 800; 
    const spotlightRadiusSq = spotlightRadius * spotlightRadius;
    const repulsionDist = 30; 
    const repulsionDistSq = repulsionDist * repulsionDist;
    const cellSize = 140; 
    
    // Shooting Star Constants - SIGNIFICANTLY REDUCED DRAG RANGE
    const shootingStarDragDistSq = 60 * 60; // Reduced from 150 to 60 for minimal wake

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'screen';

      const mouse = mouseRef.current;
      const particles = particlesRef.current;
      const currentGathering = gatheringPointRef.current;
      const len = particles.length;
      const sprite = spriteRef.current;
      const star = shootingStarRef.current;

      // --- Shooting Star Logic ---
      if (!star.active) {
        // Randomly spawn a shooting star (approx every 3-5 seconds @ 60fps)
        if (Math.random() < 0.003) {
           star.active = true;
           star.life = 100 + Math.random() * 50;
           // Spawn off screen
           if (Math.random() < 0.5) {
             star.x = -50;
             star.y = Math.random() * canvas.height;
             star.vx = 15 + Math.random() * 10;
             star.vy = (Math.random() - 0.5) * 10;
           } else {
             star.x = Math.random() * canvas.width;
             star.y = -50;
             star.vx = (Math.random() - 0.5) * 10;
             star.vy = 15 + Math.random() * 10;
           }
        }
      } else {
        star.x += star.vx;
        star.y += star.vy;
        star.life--;

        if (star.life <= 0 || star.x > canvas.width + 100 || star.y > canvas.height + 100) {
            star.active = false;
        }

        // Draw Shooting Star Head
        ctx.beginPath();
        ctx.arc(star.x, star.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#d8b4fe';
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Trail
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x - star.vx * 3, star.y - star.vy * 3);
        ctx.strokeStyle = 'rgba(216, 180, 254, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Spatial Grid
      const grid: Record<string, number[]> = {};

      // PASS 1: Physics & Grid
      for (let i = 0; i < len; i++) {
        const p = particles[i];

        // --- Interaction with Shooting Star ---
        // Reduced influence: only very close particles are affected slightly
        if (star.active) {
            const dxStar = star.x - p.x;
            const dyStar = star.y - p.y;
            const distStarSq = dxStar * dxStar + dyStar * dyStar;
            
            // If nearby shooting star, get dragged along!
            if (distStarSq < shootingStarDragDistSq) {
                const force = (1 - distStarSq / shootingStarDragDistSq) * 0.05; // Reduced force multiplier
                p.vx += star.vx * force;
                p.vy += star.vy * force;
            }
        }

        // --- Physics ---
        if (currentGathering) {
           const dx = currentGathering.x - p.x;
           const dy = currentGathering.y - p.y;
           const distSq = dx * dx + dy * dy;
           
           if (distSq < 810000) { 
             const dist = Math.sqrt(distSq);
             const force = (900 - dist) / 900;
             p.vx += (dx / dist) * force * 0.8; 
             p.vy += (dy / dist) * force * 0.8;
           }
           // Stronger damping when gathering
           p.vx *= 0.92;
           p.vy *= 0.92;
        } 
        else {
           // Normal state: Keep moving slowly
           // Add tiny random noise to keep it organic, but maintain existing velocity mostly
           const noiseScale = 0.02; 
           p.vx += (Math.random() - 0.5) * noiseScale;
           p.vy += (Math.random() - 0.5) * noiseScale;
           
           // Clamp speed to avoid them stopping completely or going too fast
           const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
           if (speed < 0.1) {
              p.vx *= 1.05;
              p.vy *= 1.05;
           } else if (speed > 1.5) {
              p.vx *= 0.95;
              p.vy *= 0.95;
           }
           
           // Less damping for perpetual movement
           // p.vx *= 0.99; // Removed strict damping to allow float
        }

        // Boundary Check / Bounce
        if (p.x < 0) p.vx += 0.02;
        if (p.x > canvas.width) p.vx -= 0.02;
        if (p.y < 0) p.vy += 0.02;
        if (p.y > canvas.height) p.vy -= 0.02;

        p.x += p.vx;
        p.y += p.vy;

        // Soft Wrap (redundant with bounce but good for failsafe)
        if (p.x < -50) p.x = canvas.width + 50;
        else if (p.x > canvas.width + 50) p.x = -50;
        if (p.y < -50) p.y = canvas.height + 50;
        else if (p.y > canvas.height + 50) p.y = -50;

        // Add to Grid
        const gx = (p.x / cellSize) | 0;
        const gy = (p.y / cellSize) | 0;
        const key = `${gx},${gy}`;
        
        if (!grid[key]) grid[key] = [];
        grid[key].push(i);
      }

      // PASS 2: Rendering
      for (let i = 0; i < len; i++) {
        const p = particles[i];

        const dxMouse = p.x - mouse.x;
        const dyMouse = p.y - mouse.y;
        const distToCursorSq = dxMouse * dxMouse + dyMouse * dyMouse;

        // Skip if far from spotlight (Culling)
        if (distToCursorSq > spotlightRadiusSq && !star.active) continue;

        let spotlightAlpha = 1 - (distToCursorSq / spotlightRadiusSq);
        
        // Ensure shooting star wake is visible even outside mouse spotlight
        if (star.active) {
            const dxStar = star.x - p.x;
            const dyStar = star.y - p.y;
            const distStarSq = dxStar * dxStar + dyStar * dyStar;
            if (distStarSq < shootingStarDragDistSq * 2) { // Slightly larger visual radius than drag radius
                spotlightAlpha = Math.max(spotlightAlpha, 1 - (distStarSq / (shootingStarDragDistSq * 2)));
            }
        }
        
        if (spotlightAlpha <= 0.01) continue;

        // Draw Glow Sprite
        if (sprite) {
           const glowSize = p.radius * 8; 
           ctx.globalAlpha = spotlightAlpha * p.baseAlpha;
           ctx.drawImage(sprite, p.x - glowSize/2, p.y - glowSize/2, glowSize, glowSize);
        }

        const distToCursor = Math.sqrt(distToCursorSq);

        // Mouse Connections
        if (distToCursor < maxMouseConnDist) {
          ctx.beginPath();
          // Tuned down multiplier from 2.5 to 1.5
          const lineAlpha = spotlightAlpha * (1 - distToCursor / maxMouseConnDist) * 1.5;
          ctx.strokeStyle = `rgba(233, 213, 255, ${lineAlpha})`; 
          // Tuned down width from 1.2 to 0.8
          ctx.lineWidth = 0.8; 
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        // Neighbors via Grid
        const gx = (p.x / cellSize) | 0;
        const gy = (p.y / cellSize) | 0;

        for (let xx = gx - 1; xx <= gx + 1; xx++) {
            for (let yy = gy - 1; yy <= gy + 1; yy++) {
                const key = `${xx},${yy}`;
                const cell = grid[key];
                if (!cell) continue;

                for (let k = 0; k < cell.length; k++) {
                    const j = cell[k];
                    if (j <= i) continue;

                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    
                    if (Math.abs(dx) > maxConnDist || Math.abs(dy) > maxConnDist) continue;

                    const distSq = dx * dx + dy * dy;

                    // Repulsion
                    if (distSq < repulsionDistSq && !currentGathering) {
                        const dist = Math.sqrt(distSq);
                        const force = (repulsionDist - dist) / repulsionDist;
                        const fx = (dx / dist) * force * 0.03;
                        const fy = (dy / dist) * force * 0.03;
                        p.vx += fx; p.vy += fy;
                        p2.vx -= fx; p2.vy -= fy;
                    }

                    // Connection Line
                    if (distSq < maxConnDistSq) {
                        const dist = Math.sqrt(distSq);
                        const distFactor = 1 - dist / maxConnDist;
                        
                        // Tuned down multiplier from 4.0 to 2.5
                        const lineAlpha = spotlightAlpha * distFactor * Math.min(p.baseAlpha, p2.baseAlpha) * 2.5;

                        if (lineAlpha > 0.02) {
                            ctx.beginPath();
                            // Brighter color
                            ctx.strokeStyle = `rgba(216, 180, 254, ${lineAlpha})`; 
                            // Tuned down width from 1.0 to 0.6
                            ctx.lineWidth = 0.6; 
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }
                }
            }
        }
      }
      
      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
    />
  );
};

export default StarryBackground;