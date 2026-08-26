import React from 'react';
import { Users, Shield } from 'lucide-react';

interface AgentCountStepProps {
  agentCount: number;
  onCountChange: (count: number) => void;
}

export const AgentCountStep: React.FC<AgentCountStepProps> = ({ agentCount, onCountChange }) => {
  const options = [1, 2, 3, 4, 5, 6];

  const countDescriptions: Record<number, { title: string; desc: string }> = {
    1: { title: 'Solo Specialist', desc: 'A laser-focused 1-on-1 grilling session from a single discipline expert.' },
    2: { title: 'Dual Interrogators', desc: 'Cross-functional perspective (e.g. CTO + CFO balancing technical & fiscal).' },
    3: { title: 'Executive Trio (Recommended)', desc: 'The optimal boardroom balance: Architecture, Economics, and Market/Growth.' },
    4: { title: 'Executive Committee', desc: 'Comprehensive panel covering Architecture, Finance, Operations, and HR.' },
    5: { title: 'Senior Board Panel', desc: 'High-intensity interrogation with deep scrutiny from 5 specialized angles.' },
    6: { title: 'Full Swarm Simulation', desc: 'Maximum pressure. The entire boardroom panel probes every claim simultaneously.' },
  };

  return (
    <div className="flex flex-col gap-6 w-full text-center">
      <div>
        <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
          How many voices should challenge you?
        </h3>
        <p
          style={{ fontFamily: "'Exo 2', sans-serif" }}
          className="text-sm text-slate-300 font-normal mt-1.5"
        >
          Configure the size of your adversarial AI boardroom panel.
        </p>
      </div>

      {/* Segmented Count Selector */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 w-full max-w-xl mx-auto">
        {options.map((num) => {
          const isSelected = agentCount === num;
          return (
            <button
              key={num}
              onClick={() => onCountChange(num)}
              className={`py-4 sm:py-5 rounded-2xl font-mono text-xl sm:text-2xl font-black transition-all duration-300 border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500/20 border-cyan-400 text-neon-cyan shadow-[0_0_25px_rgba(0,240,255,0.4)] scale-105'
                  : 'bg-slate-950/40 border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.2] hover:bg-slate-900/60'
              }`}
            >
              <span style={{ fontFamily: "'Michroma', sans-serif" }}>0{num}</span>
              <span
                style={{ fontFamily: "'Exo 2', sans-serif" }}
                className="text-[9px] uppercase tracking-widest font-normal opacity-75"
              >
                {num === 1 ? 'Agent' : 'Agents'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Capacity Description Card */}
      <div className="relative rounded-2xl p-6 bg-gradient-to-b from-slate-900/70 via-slate-950/80 to-[#060913]/90 border border-white/[0.09] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_25px_rgba(0,0,0,0.5)] max-w-xl mx-auto w-full text-left overflow-hidden">
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-neon-cyan shadow-[0_0_12px_rgba(0,240,255,0.25)]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4
              style={{ fontFamily: "'Michroma', sans-serif" }}
              className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider"
            >
              {countDescriptions[agentCount]?.title}
            </h4>
            <span className="text-[10px] font-mono text-neon-cyan uppercase tracking-wider font-semibold">
              CONFIGURED CAPACITY: {agentCount} AI PARTICIPANTS
            </span>
          </div>
        </div>
        <p
          style={{ fontFamily: "'Exo 2', sans-serif" }}
          className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed mt-2"
        >
          {countDescriptions[agentCount]?.desc}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
        <Shield className="w-3.5 h-3.5 text-neon-emerald" />
        <span style={{ fontFamily: "'Exo 2', sans-serif" }}>Each participant operates with isolated private memory & goals</span>
      </div>
    </div>
  );
};
