import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AI_AGENTS, type AIAgent } from '../data/agents';
import { Pedestal } from './Pedestal';
import { Hologram } from './Hologram';
import { AgentInfo } from './AgentInfo';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause 
} from 'lucide-react';

interface CarouselProps {
  agentIds?: string[];
  activeAgentId?: string | number | null;
  autoPlay?: boolean;
  showPedestal?: boolean;
  isInView?: boolean;
}

export const Carousel: React.FC<CarouselProps> = ({
  agentIds,
  activeAgentId,
  autoPlay = true,
  showPedestal = true,
  isInView = true,
}) => {
  // Filter agents list if specific agentIds are provided (e.g. in active live boardroom session)
  const agentsList: AIAgent[] = useMemo(() => {
    if (agentIds && agentIds.length > 0) {
      const filtered = AI_AGENTS.filter((a) => agentIds.includes(a.id));
      return filtered.length > 0 ? filtered : AI_AGENTS;
    }
    return AI_AGENTS;
  }, [agentIds]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isHovered, setIsHovered] = useState(false);
  const [isHologramHovered, setIsHologramHovered] = useState(false);
  const [isPopupHovered, setIsPopupHovered] = useState(false);
  const [showSpecsMobile, setShowSpecsMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Sync active speaker from orchestration when activeAgentId prop changes
  useEffect(() => {
    if (activeAgentId !== undefined && activeAgentId !== null) {
      const strId = String(activeAgentId).toLowerCase();
      const idx = agentsList.findIndex(
        (a) => a.id.toLowerCase() === strId || a.name.toLowerCase().includes(strId) || a.shortTitle.toLowerCase() === strId
      );
      if (idx !== -1) {
        setActiveIndex(idx);
      }
    }
  }, [activeAgentId, agentsList]);

  // Keep activeIndex within bounds if agentsList shrinks
  useEffect(() => {
    if (activeIndex >= agentsList.length) {
      setActiveIndex(0);
    }
  }, [agentsList.length, activeIndex]);

  // Responsive dynamic spacing for mobile / desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const spacing = isMobile ? 220 : 360;
  const depthSpacing = isMobile ? 130 : 210;

  // Reset auto-rotation timer whenever user manually navigates
  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (isPlaying && !isHovered && !isHologramHovered && !isPopupHovered && agentsList.length > 1) {
      timerRef.current = window.setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % agentsList.length);
      }, 3000);
    }
  };

  // 1. Navigation Handlers
  const nextAgent = () => {
    if (agentsList.length <= 1) return;
    setIsHologramHovered(false);
    setIsPopupHovered(false);
    setShowSpecsMobile(false);
    setActiveIndex((prev) => (prev + 1) % agentsList.length);
    resetTimer();
  };

  const prevAgent = () => {
    if (agentsList.length <= 1) return;
    setIsHologramHovered(false);
    setIsPopupHovered(false);
    setShowSpecsMobile(false);
    setActiveIndex((prev) => (prev - 1 + agentsList.length) % agentsList.length);
    resetTimer();
  };

  const selectAgent = (index: number) => {
    setIsHologramHovered(false);
    setIsPopupHovered(false);
    setShowSpecsMobile(false);
    setActiveIndex(index);
    resetTimer();
  };

  // 2. Auto-Play Timer with Hover-Pause & Resume (Active only when in view)
  useEffect(() => {
    const shouldPause = !isInView || !isPlaying || isHovered || isHologramHovered || isPopupHovered || agentsList.length <= 1;
    if (!shouldPause) {
      timerRef.current = window.setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % agentsList.length);
      }, 3000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isInView, isPlaying, isHovered, isHologramHovered, isPopupHovered, agentsList.length]);

  // 3. Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevAgent();
      } else if (e.key === 'ArrowRight') {
        nextAgent();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [agentsList.length]);

  // Distance math for circular arrangement
  const getWrappedDiff = (index: number) => {
    const count = agentsList.length;
    if (count <= 1) return 0;
    let diff = index - activeIndex;
    while (diff > count / 2) diff -= count;
    while (diff < -count / 2) diff += count;
    return diff;
  };

  const activeAgent = agentsList[activeIndex] || agentsList[0] || AI_AGENTS[0];

  return (
    <div 
      className="w-full flex flex-col items-center select-none relative z-10 gap-2 sm:gap-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* LEVEL 1: Wide, Centered 3D Carousel Stage */}
      <div className="w-full max-w-7xl flex flex-col items-center justify-center relative min-h-[420px] md:min-h-[460px] overflow-visible px-4">
        
        {/* Dynamic Active Agent Hologram Atmospheric Background Glow */}
        <div 
          className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[650px] max-w-[90vw] h-[480px] pointer-events-none -z-10 transition-all duration-700 ease-out"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${activeAgent.hex}30 0%, ${activeAgent.hex}12 40%, rgba(0,0,0,0) 72%)`,
            filter: 'blur(45px)',
          }}
        />
        <div 
          className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[340px] h-[320px] pointer-events-none -z-10 transition-all duration-500 ease-out"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${activeAgent.hex}45 0%, ${activeAgent.hex}15 55%, rgba(0,0,0,0) 75%)`,
            filter: 'blur(30px)',
          }}
        />

        {/* Cyberstage base grid background circles */}
        <div 
          className="absolute w-[90%] h-[160px] blur-2xl rounded-full bottom-[8%] left-1/2 -translate-x-1/2 pointer-events-none transition-colors duration-700"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${activeAgent.hex}22 0%, rgba(0,0,0,0) 70%)`
          }}
        />

        {/* 3D Carousel Stage Track */}
        <div 
          className="w-full h-[380px] flex items-center justify-center relative overflow-visible"
          style={{
            transformStyle: 'preserve-3d',
            perspective: '1200px',
          }}
        >
          {agentsList.map((agent, i) => {
            const diff = getWrappedDiff(i);
            const isActive = diff === 0;

            // Curved fan layout math with clear separation
            const angle = diff * (Math.PI / (agentsList.length <= 3 ? 3.8 : 4.6));
            
            const xPos = Math.sin(angle) * spacing * (agentsList.length === 2 ? 1.2 : 1.65);
            const zPos = (1 - Math.cos(angle)) * -depthSpacing - (isActive ? 0 : 70);
            const rotY = -angle * (180 / Math.PI) * 0.7;
            
            // Solid 100% opacity for bases to eliminate see-through transparency
            let opacityVal = 1.0;
            let scaleVal = 0.5;
            
            if (diff === 0) {
              opacityVal = 1.0;
              scaleVal = 1.0;
            } else if (Math.abs(diff) === 1) {
              opacityVal = 1.0;
              scaleVal = 0.84;
            } else if (Math.abs(diff) === 2) {
              opacityVal = 0.95;
              scaleVal = 0.70;
            } else {
              opacityVal = 0.0;
              scaleVal = 0.5;
            }

            // On mobile, only display center and immediate neighbors to fit screen width
            if (isMobile && Math.abs(diff) > 1 && agentsList.length > 2) {
              return null;
            }

            return (
              <motion.div
                key={agent.id}
                animate={{
                  x: xPos,
                  z: zPos,
                  rotateY: rotY,
                  scale: scaleVal,
                  opacity: opacityVal,
                }}
                transition={{
                  type: 'tween',
                  ease: [0.16, 1, 0.3, 1], // Smooth 60 FPS decelerating curve (1.2s)
                  duration: 1.2,
                }}
                style={{
                  position: 'absolute',
                  transformStyle: 'preserve-3d',
                  zIndex: isActive ? 40 : 10 - Math.abs(diff),
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                onClick={() => selectAgent(i)}
                className="flex flex-col items-center justify-center h-[380px] w-[300px] relative cursor-pointer overflow-visible"
              >
                {/* Optional Vector Pedestal Base (Rendered only if showPedestal is true) */}
                {showPedestal && (
                  <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 z-1">
                    <Pedestal agent={agent} isActive={isActive} distance={Math.abs(diff)} />
                  </div>
                )}

                {/* Standing Hologram Projection & Interactive Hover Zone */}
                <div 
                  className={`absolute ${showPedestal ? 'bottom-[135px]' : 'bottom-[45px]'} left-1/2 -translate-x-1/2 z-30 w-[320px] flex items-center justify-center pointer-events-auto transition-all duration-500`}
                  onMouseEnter={() => {
                    if (isActive) setIsHologramHovered(true);
                  }}
                  onMouseLeave={() => {
                    if (isActive) setIsHologramHovered(false);
                  }}
                  onClick={(e) => {
                    if (isActive) {
                      e.stopPropagation();
                      setShowSpecsMobile(prev => !prev);
                    }
                  }}
                >
                  <Hologram agent={agent} isActive={isActive} distance={Math.abs(diff)} isInView={isInView} />

                  {/* Floating Right-Side Hologram Info Box */}
                  <AnimatePresence>
                    {isActive && (isHologramHovered || isPopupHovered || showSpecsMobile) && (
                      <div
                        className="absolute left-[88%] sm:left-[96%] md:left-[100%] top-1/2 -translate-y-1/2 z-50 pointer-events-auto cursor-default"
                        onMouseEnter={() => setIsPopupHovered(true)}
                        onMouseLeave={() => setIsPopupHovered(false)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AgentInfo 
                          agent={agent} 
                          onClose={() => {
                            setIsHologramHovered(false);
                            setIsPopupHovered(false);
                            setShowSpecsMobile(false);
                          }}
                        />
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Floating Agent Title Tag */}
                <div 
                  className={`absolute ${showPedestal ? '-bottom-[55px]' : '-bottom-[22px]'} flex flex-col items-center justify-center transition-all duration-500 w-[340px] px-2 ${
                    isActive 
                      ? 'opacity-100 scale-100' 
                      : Math.abs(diff) === 1
                      ? 'opacity-90 scale-92'
                      : 'opacity-40 scale-80'
                  }`}
                >
                  <span 
                    style={{ 
                      fontFamily: "'Michroma', sans-serif",
                      color: agent.hex,
                      textShadow: isActive 
                        ? `0 0 12px ${agent.hex}` 
                        : Math.abs(diff) === 1
                        ? `0 0 8px ${agent.hex}88`
                        : `0 0 3px ${agent.hex}30`
                    }}
                    className="text-[10px] sm:text-xs font-bold tracking-[0.14em] uppercase transition-colors duration-500"
                  >
                    {agent.shortTitle} CORE
                  </span>
                  <span
                    style={{ fontFamily: "'Exo 2', sans-serif" }}
                    className="text-sm sm:text-base md:text-lg font-bold text-slate-100 mt-1 tracking-wide text-center max-w-[320px] leading-snug uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                  >
                    {agent.name}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>

      {/* LEVEL 2: Minimalist Cyber Controls */}
      {agentsList.length > 1 && (
        <div className="flex items-center justify-center gap-3.5 sm:gap-4 z-20 mt-3 sm:mt-4">
          {/* Left (Prev) Button */}
          <button
            onClick={prevAgent}
            aria-label="Previous agent station"
            className="group relative w-10 h-10 rounded-full bg-slate-950/70 hover:bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-white transition-all duration-300 backdrop-blur-xl shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_22px_rgba(0,240,255,0.4)] active:scale-90 flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/0 via-cyan-400/10 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Play/Pause Toggle Button */}
          <button
            onClick={() => setIsPlaying(p => !p)}
            aria-label={isPlaying ? 'Pause auto-rotation' : 'Play auto-rotation'}
            className={`group relative w-11 h-11 rounded-full border transition-all duration-300 backdrop-blur-xl flex items-center justify-center cursor-pointer active:scale-90 shadow-md ${
              isPlaying
                ? 'bg-slate-950/80 border-cyan-500/40 text-cyan-300 hover:border-cyan-300 hover:shadow-[0_0_24px_rgba(0,240,255,0.35)]'
                : 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:border-amber-300 hover:shadow-[0_0_24px_rgba(245,158,11,0.4)]'
            }`}
          >
            {isPlaying ? (
              <div className="relative flex items-center justify-center">
                <Pause className="w-4 h-4 text-neon-cyan" />
                <span className="absolute -inset-1.5 rounded-full border border-cyan-400/40 animate-ping opacity-75 pointer-events-none" />
              </div>
            ) : (
              <Play className="w-4 h-4 text-amber-400 fill-amber-400 translate-x-0.5" />
            )}
          </button>

          {/* Right (Next) Button */}
          <button
            onClick={nextAgent}
            aria-label="Next agent station"
            className="group relative w-10 h-10 rounded-full bg-slate-950/70 hover:bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-white transition-all duration-300 backdrop-blur-xl shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_22px_rgba(0,240,255,0.4)] active:scale-90 flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/0 via-cyan-400/10 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      )}

    </div>
  );
};
