import React from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { AIAgent } from '../data/agents';
import { Activity, X } from 'lucide-react';

interface AgentInfoProps {
  agent: AIAgent;
  className?: string;
  onClose?: () => void;
}

export const AgentInfo: React.FC<AgentInfoProps> = ({ agent, className = '', onClose }) => {
  // Border and text styling map for active color theme
  const themeMap = {
    cyan: {
      text: 'text-neon-cyan',
      glowText: 'glow-text-cyan',
      bgGlow: 'bg-neon-cyan/10',
      border: 'border-neon-cyan/50',
      bracket: 'border-neon-cyan',
      badge: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30',
    },
    purple: {
      text: 'text-neon-purple',
      glowText: 'glow-text-purple',
      bgGlow: 'bg-neon-purple/10',
      border: 'border-neon-purple/50',
      bracket: 'border-neon-purple',
      badge: 'bg-neon-purple/10 text-neon-purple border-neon-purple/30',
    },
    emerald: {
      text: 'text-neon-emerald',
      glowText: 'glow-text-emerald',
      bgGlow: 'bg-neon-emerald/10',
      border: 'border-neon-emerald/50',
      bracket: 'border-neon-emerald',
      badge: 'bg-neon-emerald/10 text-neon-emerald border-neon-emerald/30',
    },
    pink: {
      text: 'text-neon-pink',
      glowText: 'glow-text-pink',
      bgGlow: 'bg-neon-pink/10',
      border: 'border-neon-pink/50',
      bracket: 'border-neon-pink',
      badge: 'bg-neon-pink/10 text-neon-pink border-neon-pink/30',
    },
    amber: {
      text: 'text-neon-amber',
      glowText: 'glow-text-amber',
      bgGlow: 'bg-neon-amber/10',
      border: 'border-neon-amber/50',
      bracket: 'border-neon-amber',
      badge: 'bg-neon-amber/10 text-neon-amber border-neon-amber/30',
    },
    rose: {
      text: 'text-neon-rose',
      glowText: 'glow-text-rose',
      bgGlow: 'bg-neon-rose/10',
      border: 'border-neon-rose/50',
      bracket: 'border-neon-rose',
      badge: 'bg-neon-rose/10 text-neon-rose border-neon-rose/30',
    },
  };

  const theme = themeMap[agent.color] || themeMap.cyan;

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0, x: 20, scale: 0.96 },
    visible: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: { 
        duration: 0.3, 
        ease: 'easeOut',
        staggerChildren: 0.06 
      } 
    },
    exit: { 
      opacity: 0, 
      x: 15, 
      scale: 0.96,
      transition: { duration: 0.2, ease: 'easeIn' } 
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 4 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } }
  };

  return (
    <motion.div
      key={agent.id}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`relative w-[340px] sm:w-[440px] md:w-[490px] p-4 sm:p-5 rounded-2xl bg-slate-950/95 border ${theme.border} backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-visible select-none ${className}`}
    >
      {/* Sci-Fi HUD Leader Line pointing to Hologram on Left */}
      <div 
        className="hidden sm:block absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-[1px] pointer-events-none"
        style={{
          background: `linear-gradient(to right, transparent, ${agent.hex})`
        }}
      />
      <div 
        className="hidden sm:block absolute -left-9 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none animate-ping"
        style={{ backgroundColor: agent.hex }}
      />
      <div 
        className="hidden sm:block absolute -left-9 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
        style={{ backgroundColor: agent.hex }}
      />

      {/* Cyber Grid overlay inside card */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none opacity-40 rounded-2xl overflow-hidden" />

      {/* Cyber Brackets (Corner Accents) */}
      <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${theme.bracket}`} />
      <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${theme.bracket}`} />
      <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${theme.bracket}`} />
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${theme.bracket}`} />

      {/* Ambient background glow inside the card */}
      <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${theme.bgGlow}`} />

      {/* Header Info */}
      <div className="flex flex-col gap-1 relative z-10">
        <div className="flex items-center justify-between">
          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono border uppercase tracking-wider font-bold ${theme.badge}`}>
            <Activity className="w-3 h-3 animate-pulse" />
            {agent.shortTitle} CORE // ACTIVE ROLE
          </span>

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close telemetry overlay"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <motion.div variants={itemVariants} className="flex flex-col gap-0.5 mt-2">
          <h2
            style={{ fontFamily: "'Michroma', sans-serif" }}
            className="text-base sm:text-lg font-bold tracking-[0.1em] text-white leading-tight uppercase"
          >
            {agent.name}
          </h2>
          <span className={`text-xs font-mono tracking-wider ${theme.text} uppercase font-bold leading-normal`}>
            {agent.role}
          </span>
        </motion.div>
      </div>

      {/* Divider */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-800 to-transparent my-2.5 relative z-10" />

      {/* Clean Role Explanation Only */}
      <motion.p 
        variants={itemVariants}
        style={{ fontFamily: "'Exo 2', sans-serif" }}
        className="text-[15px] sm:text-base text-slate-300 font-normal leading-[1.65] relative z-10"
      >
        {agent.description}
      </motion.p>
    </motion.div>
  );
};
