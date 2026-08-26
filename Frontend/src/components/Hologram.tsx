import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { AIAgent } from '../data/agents';

interface HologramProps {
  agent: AIAgent;
  isActive: boolean;
  distance?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export const Hologram: React.FC<HologramProps> = ({ agent, isActive, distance = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(0); // Materialization progress (0 to 1)
  const particlesRef = useRef<Particle[]>([]);

  const dist = distance;
  const isCenter = dist === 0;
  const isNeighbor = dist === 1;

  // Multi-tier visual hierarchy: Center > Immediate Neighbor > Extreme Background
  const imageOpacity = isCenter ? 0.98 : isNeighbor ? 0.82 : 0.35;
  const imageBrightness = isCenter ? '1.18' : isNeighbor ? '0.96' : '0.62';
  const dropShadow = isCenter
    ? `drop-shadow(0 0 18px ${agent.hex}cc) drop-shadow(0 0 30px ${agent.hex}55)`
    : isNeighbor
    ? `drop-shadow(0 0 14px ${agent.hex}aa) drop-shadow(0 0 20px ${agent.hex}44)`
    : `drop-shadow(0 0 6px ${agent.hex}44)`;
  const bgAuraOpacity = isCenter ? 0.9 : isNeighbor ? 0.65 : 0.15;
  const bracketOpacity = isCenter ? 1.0 : isNeighbor ? 0.75 : 0.3;

  // 1. High-Resolution Canvas Particle Emitter (Ascending Sparks)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = 300;
    let height = 360;

    const handleResize = () => {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      width = rect.width;
      height = rect.height;
      
      // Set display size
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      // Set backing store size
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      // Normalize coordinate system to CSS pixels
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Initialize particles
    const initParticles = () => {
      const particles: Particle[] = [];
      const particleCount = 35;
      for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle(true));
      }
      particlesRef.current = particles;
    };

    const createParticle = (randomY = false): Particle => {
      const maxLife = 50 + Math.random() * 60;
      return {
        x: width / 2 + (Math.random() - 0.5) * 60,
        y: randomY ? height * 0.4 + Math.random() * height * 0.45 : height * 0.85,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.6 - Math.random() * 1.2,
        size: 0.8 + Math.random() * 1.6,
        alpha: Math.random() * 0.5 + 0.2,
        life: randomY ? Math.random() * maxLife : 0,
        maxLife,
      };
    };

    initParticles();

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth progress interpolation
      const targetProgress = isActive ? 1 : 0;
      progressRef.current += (targetProgress - progressRef.current) * 0.08;
      const progress = progressRef.current;

      const activeColor = agent.hex;

      // Draw Particles (Volumetric sparks)
      const particles = particlesRef.current;
      particles.forEach((p, index) => {
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.life * 0.06) * 0.15;
        p.life++;

        const ageRatio = p.life / p.maxLife;
        const currentAlpha = p.alpha * (1 - ageRatio) * (isActive ? 1.0 : 0.2 + 0.8 * progress);

        if (p.life >= p.maxLife || p.y < height * 0.15) {
          particles[index] = createParticle(false);
        } else {
          ctx.fillStyle = hexToRgba(activeColor, currentAlpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [agent, isActive]);

  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Render Agent-Specific Vector Graphic Content
  const renderAgentVector = () => {
    const color = agent.hex;
    
    switch (agent.iconType) {
      case 'chart':
        return (
          <g>
            <line x1="60" y1="140" x2="145" y2="140" stroke={color} strokeWidth="1.5" opacity="0.6" />
            <line x1="60" y1="60" x2="60" y2="140" stroke={color} strokeWidth="1.5" opacity="0.6" />
            <line x1="60" y1="115" x2="145" y2="115" stroke={color} strokeWidth="0.5" strokeDasharray="2, 2" opacity="0.3" />
            <line x1="60" y1="90" x2="145" y2="90" stroke={color} strokeWidth="0.5" strokeDasharray="2, 2" opacity="0.3" />
            <rect x="70" y="105" width="12" height="35" fill={color} fillOpacity="0.4" stroke={color} strokeWidth="1" />
            <rect x="90" y="85" width="12" height="55" fill={color} fillOpacity="0.6" stroke={color} strokeWidth="1" />
            <rect x="110" y="70" width="12" height="70" fill={color} fillOpacity="0.8" stroke={color} strokeWidth="1.5" />
            <rect x="130" y="55" width="12" height="85" fill="#fff" fillOpacity="0.9" stroke={color} strokeWidth="2" />
            <polyline points="76,100 96,80 116,65 136,45" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="136" cy="45" r="4" fill="#fff" className="animate-ping" style={{ transformOrigin: '136px 45px' }} />
            <circle cx="136" cy="45" r="2.5" fill={color} />
          </g>
        );

      case 'matrix':
        return (
          <g className="animate-bob">
            <polygon points="100,50 140,72 100,94 60,72" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
            <polygon points="100,75 140,97 100,119 60,97" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" />
            <polygon points="100,100 140,122 100,144 60,122" fill={color} fillOpacity="0.4" stroke={color} strokeWidth="2" />
            <line x1="100" y1="50" x2="100" y2="144" stroke="#fff" strokeWidth="1.5" strokeDasharray="2, 2" opacity="0.8" />
            <circle cx="100" cy="50" r="3" fill="#fff" />
            <circle cx="140" cy="72" r="2" fill={color} />
            <circle cx="60" cy="72" r="2" fill={color} />
            <line x1="100" y1="94" x2="140" y2="97" stroke={color} strokeWidth="1" opacity="0.6" />
            <line x1="100" y1="94" x2="60" y2="97" stroke={color} strokeWidth="1" opacity="0.6" />
          </g>
        );

      case 'flow':
        return (
          <g>
            <circle cx="100" cy="100" r="16" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
            <circle cx="100" cy="100" r="6" fill="#fff" />
            <circle cx="65" cy="70" r="9" fill={color} fillOpacity="0.5" stroke={color} strokeWidth="1.5" />
            <circle cx="135" cy="70" r="11" fill={color} fillOpacity="0.5" stroke={color} strokeWidth="1.5" />
            <circle cx="65" cy="130" r="12" fill={color} fillOpacity="0.5" stroke={color} strokeWidth="1.5" />
            <circle cx="135" cy="130" r="8" fill={color} fillOpacity="0.5" stroke={color} strokeWidth="1.5" />
            <line x1="100" y1="100" x2="65" y2="70" stroke={color} strokeWidth="1.5" strokeDasharray="3, 3" />
            <line x1="100" y1="100" x2="135" y2="70" stroke={color} strokeWidth="1.5" />
            <line x1="100" y1="100" x2="65" y2="130" stroke={color} strokeWidth="2" />
            <line x1="100" y1="100" x2="135" y2="130" stroke={color} strokeWidth="1" strokeDasharray="2, 2" />
            <line x1="65" y1="70" x2="135" y2="70" stroke={color} strokeWidth="1" opacity="0.4" />
            <line x1="65" y1="130" x2="135" y2="130" stroke={color} strokeWidth="1" opacity="0.4" />
          </g>
        );

      case 'radar':
        return (
          <g>
            <circle cx="100" cy="100" r="45" fill="none" stroke={color} strokeWidth="1" strokeDasharray="3, 3" opacity="0.4" />
            <circle cx="100" cy="100" r="32" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
            <circle cx="100" cy="100" r="18" fill="none" stroke={color} strokeWidth="2" opacity="0.8" />
            <line x1="55" y1="100" x2="145" y2="100" stroke={color} strokeWidth="1" opacity="0.5" />
            <line x1="100" y1="55" x2="100" y2="145" stroke={color} strokeWidth="1" opacity="0.5" />
            <g className="animate-spin" style={{ transformOrigin: '100px 100px', animationDuration: '8s' }}>
              <path d="M 100 100 L 145 100 A 45 45 0 0 0 131.8 68.2 Z" fill={`url(#radar-grad-${agent.id})`} opacity="0.3" />
              <line x1="100" y1="100" x2="145" y2="100" stroke={color} strokeWidth="2" strokeLinecap="round" />
            </g>
            <circle cx="120" cy="85" r="3.5" fill={color} className="animate-ping" style={{ transformOrigin: '120px 85px' }} />
            <circle cx="120" cy="85" r="2.5" fill="#fff" />
            <circle cx="85" cy="115" r="2" fill={color} />
          </g>
        );

      case 'atom':
        return (
          <g className="animate-pulse">
            <path d="M 70 85 C 70 65, 95 65, 100 80 C 105 65, 130 65, 130 85 C 135 95, 135 110, 125 120 C 120 135, 105 135, 100 125 C 95 135, 80 135, 75 120 C 65 110, 65 95, 70 85 Z" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2" />
            <circle cx="85" cy="85" r="3" fill="#fff" />
            <circle cx="115" cy="85" r="3" fill="#fff" />
            <circle cx="100" cy="100" r="4" fill={color} />
            <circle cx="85" cy="115" r="2.5" fill="#fff" />
            <circle cx="115" cy="115" r="2.5" fill="#fff" />
            <line x1="85" y1="85" x2="100" y2="100" stroke="#fff" strokeWidth="1.5" />
            <line x1="115" y1="85" x2="100" y2="100" stroke="#fff" strokeWidth="1.5" />
            <line x1="85" y1="115" x2="100" y2="100" stroke="#fff" strokeWidth="1.5" />
            <line x1="115" y1="115" x2="100" y2="100" stroke="#fff" strokeWidth="1.5" />
            <path d="M 55 100 A 45 45 0 0 1 145 100" fill="none" stroke={color} strokeWidth="1" strokeDasharray="4, 4" opacity="0.6" />
          </g>
        );

      case 'waves':
        return (
          <g>
            <circle cx="100" cy="80" r="15" fill={color} fillOpacity="0.4" stroke={color} strokeWidth="2" />
            <circle cx="100" cy="80" r="6" fill="#fff" />
            <path d="M 72 130 C 72 108, 128 108, 128 130 Z" fill={color} fillOpacity="0.4" stroke={color} strokeWidth="2" />
            <circle cx="68" cy="88" r="10" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" />
            <path d="M 50 130 C 50 115, 86 115, 86 130 Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" opacity="0.7" />
            <circle cx="132" cy="88" r="10" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" />
            <path d="M 114 130 C 114 115, 150 115, 150 130 Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" opacity="0.7" />
            <circle cx="100" cy="100" r="48" fill="none" stroke={color} strokeWidth="1" strokeDasharray="4, 4" opacity="0.5" />
          </g>
        );

      default:
        return (
          <circle cx="100" cy="100" r="30" fill={color} fillOpacity="0.5" stroke={color} strokeWidth="2" />
        );
    }
  };

  return (
    <div className="relative w-full h-[300px] sm:h-[360px] flex items-center justify-center pointer-events-none select-none">
      
      {/* 1. High-Resolution Canvas for Containment Beam and Spark Particles */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full filter drop-shadow-[0_0_15px_rgba(0,240,255,0.06)]"
      />

      {/* 2. Layered SVG HUD Panel or Hologram Character Projection */}
      <motion.div
        animate={{
          opacity: isActive ? 1 : 0.25,
          scale: isActive ? 1 : 0.8,
          y: isActive ? -5 : 20,
        }}
        transition={{
          type: 'spring',
          stiffness: 110,
          damping: 20,
          mass: 0.9
        }}
        className="absolute inset-0 flex items-center justify-center z-10"
      >
        {/* Radiant Atmospheric Backdrop Glow matching Agent Base Color */}
        <div
          className="absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${agent.hex}${isActive ? '45' : '10'} 0%, ${agent.hex}${isActive ? '18' : '02'} 45%, transparent 75%)`,
            filter: isActive ? 'blur(28px)' : 'blur(16px)',
            transform: isActive ? 'scale(1.2)' : 'scale(0.8)',
            opacity: isActive ? 1.0 : 0.2,
          }}
        />

        {agent.image ? (
          /* ================= HOLOGRAPHIC HUMAN CHARACTER PROJECTION ================= */
          <div className="relative w-60 h-72 sm:w-68 sm:h-80 flex flex-col items-center justify-end">
            
            {/* Background Holographic Glow */}
            <div
              className="absolute inset-0 rounded-full blur-2xl pointer-events-none transition-opacity duration-500 z-0"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${agent.hex}35 0%, #a855f718 50%, transparent 75%)`,
                opacity: bgAuraOpacity,
              }}
            />

            {/* Projected Character Cutout with Floating Hover Animation */}
            <motion.div
              animate={{
                y: isActive ? [-4, 4, -4] : [0, 0, 0],
                rotate: isActive ? [-0.5, 0.5, -0.5] : [0, 0, 0],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative w-full h-full flex items-end justify-center overflow-visible z-10"
            >
              {/* Masked Character & Scanline Layer */}
              <div 
                className="relative w-full h-full flex items-end justify-center overflow-visible"
                style={{
                  maskImage: 'linear-gradient(to top, transparent 0%, rgba(0,0,0,0.95) 4%, black 10%)',
                  WebkitMaskImage: 'linear-gradient(to top, transparent 0%, rgba(0,0,0,0.95) 4%, black 10%)',
                }}
              >
                <img
                  src={agent.image}
                  alt={agent.name}
                  className="w-full h-full object-contain object-bottom select-none pointer-events-none transition-all duration-500"
                  style={{
                    filter: `contrast(1.05) brightness(${imageBrightness}) ${dropShadow}`,
                    opacity: imageOpacity,
                  }}
                />

                {/* Animated Horizontal Scanlines Overlay on the Character */}
                <div
                  className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
                  style={{
                    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${agent.hex}66 3px, ${agent.hex}66 4px)`,
                  }}
                />
              </div>

              {/* Precision Hologram HUD Corner Brackets - Flush locked to all 4 corners */}
              <div 
                className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-500"
                style={{ opacity: bracketOpacity }}
              >
                <span 
                  className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2" 
                  style={{ borderColor: agent.hex }} 
                />
                <span 
                  className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2" 
                  style={{ borderColor: agent.hex }} 
                />
                <span 
                  className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2" 
                  style={{ borderColor: agent.hex }} 
                />
                <span 
                  className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2" 
                  style={{ borderColor: agent.hex }} 
                />
              </div>
            </motion.div>
          </div>
        ) : (
          /* ================= STANDARD SVG VECTOR HUD PANEL ================= */
          <svg 
            viewBox="0 0 200 200" 
            className="w-48 h-48 sm:w-56 sm:h-56"
          >
            {/* Definitions for gradients */}
            <defs>
              <linearGradient id={`radar-grad-${agent.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={agent.hex} stopOpacity="1" />
                <stop offset="100%" stopColor={agent.hex} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* BACKGROUND TELEMETRY LABELS (Cyber HUD detail) */}
            <g opacity="0.6">
              {/* Top Coordinate reading */}
              <text x="32" y="32" fill={agent.hex} className="font-mono text-[5.5px] tracking-widest" opacity="0.8">
                LOC: [40.23, -12.90]
              </text>
              {/* Top Right status */}
              <text x="135" y="32" fill={agent.hex} className="font-mono text-[5.5px] tracking-widest text-right" opacity="0.8">
                SYS.ACTIVE
              </text>
              {/* Bottom Left indicator */}
              <text x="32" y="172" fill={agent.hex} className="font-mono text-[5.5px] tracking-widest" opacity="0.8">
                FOC_PWR // 99.8%
              </text>
              {/* Bottom Right version */}
              <text x="132" y="172" fill={agent.hex} className="font-mono text-[5.5px] tracking-widest text-right" opacity="0.8">
                PROT_V8.2
              </text>
            </g>

            {/* CONCENTRIC CYBER RETICLE RINGS */}
            <g className="animate-spin" style={{ transformOrigin: '100px 100px', animationDuration: '30s' }}>
              <circle cx="100" cy="100" r="75" fill="none" stroke={agent.hex} strokeWidth="1" strokeDasharray="8, 12" opacity="0.4" />
              <circle cx="100" cy="100" r="88" fill="none" stroke={agent.hex} strokeWidth="0.5" strokeDasharray="4, 18" opacity="0.25" />
            </g>

            {/* MAIN CENTRAL VECTOR GRAPHIC */}
            <g className="filter drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
              {renderAgentVector()}
            </g>
          </svg>
        )}
      </motion.div>

    </div>
  );
};
