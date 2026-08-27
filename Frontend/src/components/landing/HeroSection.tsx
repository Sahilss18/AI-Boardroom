import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface HeroSectionProps {
  onStartSimulation: () => void;
  onExplore: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExplore }) => {
  return (
    <section
      id="hero"
      className="relative w-full pt-32 sm:pt-36 pb-10 sm:pb-14 flex flex-col items-center justify-center overflow-hidden px-6 bg-transparent select-none"
    >
      {/* 2. Main Hero Typography & Callouts */}
      <div className="max-w-5xl mx-auto flex flex-col items-center text-center z-10 gap-6 sm:gap-7">
        {/* Brand Title with Logo as Stylized Initial 'R' */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex flex-row items-center justify-center gap-1 sm:gap-2 mb-2 select-none"
        >
          <img
            src="/logo.png"
            alt="R"
            className="h-10 sm:h-16 md:h-20 lg:h-24 w-auto object-contain filter invert brightness-200 drop-shadow-[0_0_18px_rgba(0,240,255,0.55)] hover:scale-105 transition-transform duration-300 -mr-0.5 sm:-mr-1"
          />

          <h2
            style={{ fontFamily: "'Michroma', sans-serif" }}
            className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-[0.14em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 drop-shadow-[0_0_25px_rgba(0,240,255,0.35)]"
          >
            EFLECTION <span className="text-neon-cyan drop-shadow-[0_0_15px_#00f0ff]">AI</span>
          </h2>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
          className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold tracking-tight text-white leading-[1.08] max-w-4xl"
        >
          Practice Before{' '}
          <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-sky-400">
            The Room Does.
            <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-yellow-200 to-sky-400 opacity-40 blur-xs" />
          </span>
        </motion.h1>

        {/* Supporting Line */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
          style={{ fontFamily: "'Michroma', sans-serif" }}
          className="text-xs sm:text-sm md:text-base text-amber-200/90 tracking-[0.1em] uppercase w-full text-center max-w-5xl font-medium sm:whitespace-nowrap drop-shadow-[0_0_12px_rgba(245,158,11,0.25)] px-4"
        >
          Your presentation. Their questions. Every possible objection.
        </motion.p>

        {/* Subheadline Copy */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          style={{ fontFamily: "'Outfit', sans-serif" }}
          className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl leading-relaxed font-normal"
        >
          A real-time multi-agent AI boardroom that challenges your ideas, verifies your claims against uploaded materials, and prepares you for high-stakes conversations.
        </motion.p>

        {/* Centered CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55, ease: 'easeOut' }}
          className="flex items-center justify-center mt-4 z-20"
        >
          {/* Snug Yellow Explore Button with Downward Arrow */}
          <button
            onClick={onExplore}
            className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 rounded-xl border border-amber-400/80 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-display font-extrabold text-sm tracking-wider uppercase overflow-hidden shadow-[0_0_25px_rgba(234,179,8,0.4)] hover:shadow-[0_0_40px_rgba(234,179,8,0.65)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer group"
          >
            <span>EXPLORE</span>
            <ArrowDown className="w-4 h-4 text-slate-950 group-hover:translate-y-1 transition-transform duration-300" />
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000" />
          </button>
        </motion.div>

      </div>
    </section>
  );
};
