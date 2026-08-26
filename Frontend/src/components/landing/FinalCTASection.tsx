import React from 'react';
import { Play } from 'lucide-react';

interface FinalCTASectionProps {
  onStartSimulation: () => void;
  onExplore?: () => void;
}

export const FinalCTASection: React.FC<FinalCTASectionProps> = ({ onStartSimulation }) => {
  return (
    <section className="relative w-full py-10 sm:py-14 px-6 bg-transparent overflow-hidden flex flex-col items-center justify-center">
      {/* Background Central Atmospheric Light Projection Cone */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-t from-cyan-500/15 via-purple-500/10 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Cyber Grid Substrate */}
      <div className="absolute inset-0 cyber-grid-overlay pointer-events-none z-0 opacity-40" />

      <div className="max-w-4xl mx-auto flex flex-col items-center text-center z-10 gap-6 sm:gap-8">
        
        {/* Headline */}
        <h2 className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold text-white tracking-tight leading-[1.08]">
          Stop rehearsing{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-sky-400">
            alone.
          </span>
        </h2>

        {/* Subheadline */}
        <p
          style={{ fontFamily: "'Michroma', sans-serif" }}
          className="text-xs sm:text-sm md:text-base text-slate-300 tracking-[0.06em] max-w-2xl leading-relaxed"
        >
          Build your boardroom. Upload your material. Face the questions.
        </p>

        {/* Centered Start Simulation Action */}
        <div className="flex items-center justify-center mt-4">
          <button
            onClick={onStartSimulation}
            className="w-full sm:w-auto relative px-10 py-4 rounded-xl border border-neon-cyan/80 bg-neon-cyan text-slate-950 font-display font-extrabold text-sm tracking-wider uppercase overflow-hidden shadow-[0_0_35px_rgba(0,240,255,0.5)] hover:shadow-[0_0_55px_rgba(0,240,255,0.8)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer group"
          >
            <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
            <span>START A SIMULATION</span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000" />
          </button>
        </div>

      </div>
    </section>
  );
};
