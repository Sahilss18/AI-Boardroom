import React from 'react';
import { AI_AGENTS, type AIAgent } from '../../data/agents';
import { Check, ArrowUpRight } from 'lucide-react';

interface PersonaSelectStepProps {
  maxCount: number;
  selectedIds: string[];
  onTogglePersona: (agentId: string) => void;
}

export const PersonaSelectStep: React.FC<PersonaSelectStepProps> = ({
  maxCount,
  selectedIds,
  onTogglePersona,
}) => {
  const isCapReached = selectedIds.length >= maxCount;

  return (
    <div className="flex flex-col gap-4 sm:gap-4.5 w-full select-none">
      
      {/* Header */}
      <div className="text-center">
        <h3
          style={{ fontFamily: "'Michroma', sans-serif" }}
          className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight"
        >
          BUILD YOUR BOARD.
        </h3>
        <p
          style={{ fontFamily: "'Exo 2', sans-serif" }}
          className="text-xs sm:text-sm text-slate-300 font-normal mt-1"
        >
          Select <span className="text-neon-cyan font-bold font-mono">{maxCount}</span> specialized personas to sit across the table.
        </p>

        {/* Counter Badge */}
        <div className="inline-flex items-center gap-2 mt-2 px-3.5 py-0.5 rounded-full border border-white/[0.1] bg-slate-900/60 backdrop-blur-xl text-xs font-mono">
          <span className="text-slate-400">SELECTION STATUS:</span>
          <span className={`font-bold ${selectedIds.length === maxCount ? 'text-neon-emerald' : 'text-neon-cyan'}`}>
            {selectedIds.length} / {maxCount} SELECTED
          </span>
        </div>
      </div>

      {/* Scaled & Refined Intelligence Flow Persona Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5 w-full max-h-[440px] sm:max-h-[470px] overflow-y-auto p-2 sm:p-2.5 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
        {AI_AGENTS.map((agent: AIAgent, idx: number) => {
          const isSelected = selectedIds.includes(agent.id);
          const isDisabled = !isSelected && isCapReached;

          return (
            <button
              key={agent.id}
              onClick={() => onTogglePersona(agent.id)}
              disabled={isDisabled}
              className={`relative rounded-2xl p-3.5 sm:p-4 text-left flex flex-col justify-between overflow-hidden group transition-all duration-200 backdrop-blur-2xl select-none cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-[#060913]/98 border-2 border-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_0_20px_rgba(0,240,255,0.25)]'
                  : isDisabled
                  ? 'bg-slate-950/30 border border-white/[0.04] opacity-35 cursor-not-allowed'
                  : 'bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-[#060913]/95 border border-white/[0.09] hover:border-white/[0.22] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_12px_28px_rgba(0,0,0,0.55)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_16px_36px_rgba(0,0,0,0.8)] hover:-translate-y-0.5'
              }`}
            >
              {/* Top Inner Specular Light Edge */}
              <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

              {/* Organic Liquid-Glass Refraction & Glow Aura at Bottom-Left */}
              <div 
                className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full blur-[35px] pointer-events-none opacity-30 group-hover:opacity-65 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle at 35% 65%, ${agent.hex} 0%, transparent 70%)`
                }}
              />

              {/* Subtle Fluid Bottom Rim Line */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-[1.5px] opacity-25 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, ${agent.hex} 0%, transparent 65%)`
                }}
              />

              {/* Top Section: Agent Number + Floating Circular Glass Avatar Container */}
              <div className="relative z-10 w-full">
                <div className="flex items-center justify-between mb-2.5">
                  {/* Agent Header Badge */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase">
                      AGENT
                    </span>
                    <span
                      style={{ fontFamily: "'Michroma', sans-serif" }}
                      className="text-base sm:text-lg font-bold tracking-tight text-white"
                    >
                      0{idx + 1}
                    </span>
                  </div>

                  {/* Floating Circular Glass Avatar Container */}
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/90 border backdrop-blur-xl flex items-center justify-center relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_3px_10px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:scale-105"
                    style={{
                      borderColor: isSelected ? agent.hex : `${agent.hex}60`,
                      boxShadow: isSelected
                        ? `inset 0 1px 1px rgba(255,255,255,0.3), 0 0 14px ${agent.hex}60`
                        : `inset 0 1px 1px rgba(255,255,255,0.2), 0 0 10px ${agent.hex}25`
                    }}
                  >
                    <img
                      src={agent.image}
                      alt={agent.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Geometric Heading (Agent Name) */}
                <h4
                  style={{ fontFamily: "'Michroma', sans-serif" }}
                  className="text-xs sm:text-[13px] font-bold text-white tracking-[0.06em] uppercase mb-1 leading-snug group-hover:text-white transition-colors"
                >
                  {agent.name}
                </h4>

                {/* Clean Uppercase Colored Subheading (Role) */}
                <div
                  style={{ fontFamily: "'Exo 2', sans-serif", color: agent.hex }}
                  className="text-[10px] sm:text-[10.5px] font-semibold tracking-wide uppercase mb-2 leading-tight"
                >
                  {agent.role}
                </div>

                {/* Body Description Text in Exo 2 */}
                <p
                  style={{ fontFamily: "'Exo 2', sans-serif" }}
                  className="text-[11px] sm:text-xs text-slate-300 font-normal leading-[1.45] line-clamp-2 mb-1 opacity-90"
                >
                  {agent.description}
                </p>
              </div>

              {/* Bottom Card Footer: Minimal Telemetry + Action Button */}
              <div className="mt-3 pt-2.5 border-t border-white/[0.07] flex items-center justify-between relative z-10 w-full">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'animate-ping' : ''}`}
                    style={{ backgroundColor: agent.hex, boxShadow: `0 0 6px ${agent.hex}` }}
                  />
                  <span className="text-[9.5px] font-mono text-slate-400 tracking-wider uppercase font-medium">
                    {isSelected ? 'ACTIVE // ASSIGNED' : 'READY TO DEPLOY'}
                  </span>
                </div>

                {/* Small Circular Check / Action Button */}
                <div
                  className={`w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full border flex items-center justify-center transition-all duration-300 ${
                    isSelected
                      ? 'bg-neon-cyan border-cyan-300 text-slate-950 shadow-[0_0_10px_#00f0ff]'
                      : 'border-white/[0.12] bg-white/[0.03] group-hover:bg-white/[0.1] text-slate-400 group-hover:text-white'
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  )}
                </div>
              </div>

            </button>
          );
        })}
      </div>

    </div>
  );
};
