import React from 'react';
import { Shield, Compass, Terminal, Sparkles, Play } from 'lucide-react';

interface NavbarProps {
  onStartSimulation: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onStartSimulation }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/45 backdrop-blur-xl border-b border-white/[0.08] py-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        
        {/* Brand Logo */}
        <a href="#hero" className="flex items-center gap-0.5 group cursor-pointer select-none">
          <img
            src="/logo.png"
            alt="R"
            className="h-6 sm:h-7 w-auto object-contain filter invert brightness-200 drop-shadow-[0_0_6px_#00f0ff] group-hover:scale-105 transition-transform duration-300"
          />
          <span
            style={{ fontFamily: "'Michroma', sans-serif" }}
            className="font-bold text-sm sm:text-base tracking-[0.12em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300"
          >
            EFLECTION <span className="text-neon-cyan drop-shadow-[0_0_10px_#00f0ff] group-hover:animate-pulse">AI</span>
          </span>
        </a>

        {/* Navigation Links (Title Case + Michroma Font) */}
        <nav
          style={{ fontFamily: "'Michroma', sans-serif" }}
          className="hidden md:flex items-center gap-6 lg:gap-7 text-[10px] sm:text-[11px] text-slate-300 tracking-wide"
        >
          <a
            href="#what-is"
            className="hover:text-neon-cyan transition-all duration-300 flex items-center gap-1.5 cursor-pointer hover:drop-shadow-[0_0_8px_#00f0ff]"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400/70" />
            <span>What Is It</span>
          </a>
          <a
            href="#boardroom"
            className="hover:text-neon-cyan transition-all duration-300 flex items-center gap-1.5 cursor-pointer hover:drop-shadow-[0_0_8px_#00f0ff]"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400/70" />
            <span>The Room</span>
          </a>
          <a
            href="#intelligence"
            className="hover:text-neon-cyan transition-all duration-300 flex items-center gap-1.5 cursor-pointer hover:drop-shadow-[0_0_8px_#00f0ff]"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400/70" />
            <span>Decision Engine</span>
          </a>
          <a
            href="#benefits"
            className="hover:text-neon-cyan transition-all duration-300 flex items-center gap-1.5 cursor-pointer hover:drop-shadow-[0_0_8px_#00f0ff]"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400/70" />
            <span>Edge</span>
          </a>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onStartSimulation}
            style={{ fontFamily: "'Michroma', sans-serif" }}
            className="relative px-4 sm:px-5 py-2 rounded-lg border border-cyan-400/50 bg-cyan-950/30 text-[10px] sm:text-[11px] text-neon-cyan font-bold tracking-wide overflow-hidden hover:bg-neon-cyan hover:text-slate-950 hover:shadow-[0_0_20px_rgba(0,240,255,0.6)] transition-all duration-300 active:scale-95 group cursor-pointer"
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <Play className="w-3 h-3 fill-current" />
              <span>Enter Boardroom</span>
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
          </button>
        </div>

      </div>
    </header>
  );
};
