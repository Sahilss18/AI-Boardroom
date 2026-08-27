import React from 'react';
import { 
  Zap, 
  FileCheck2, 
  Users, 
  Mic, 
  BarChart3, 
  Flame
} from 'lucide-react';

export const BenefitsSection: React.FC = () => {
  const benefits = [
    {
      num: '01',
      title: 'REALISTIC INTERRUPTIONS',
      description: 'Practice against adversarial agents that detect hesitation, weak justifications, and logical gaps to challenge you mid-sentence.',
      icon: Zap,
      hex: '#ff9f00', // Amber
      badge: 'BARGE-IN READY'
    },
    {
      num: '02',
      title: 'FACT-GROUNDED QUESTIONS',
      description: 'Your uploaded slides and architecture specs become the single source of truth. The board cites exact sections when questioning assertions.',
      icon: FileCheck2,
      hex: '#00f0ff', // Cyan
      badge: 'QDRANT RAG'
    },
    {
      num: '03',
      title: 'MULTIPLE PERSPECTIVES',
      description: 'Face a diverse panel simultaneously. While the CTO probes database indexing, the CFO scrutinizes margin erosion and CAC.',
      icon: Users,
      hex: '#bd00ff', // Purple
      badge: '7 PERSONAS'
    },
    {
      num: '04',
      title: 'FULL-DUPLEX REALTIME VOICE',
      description: 'Speak aloud naturally. No typing or artificial latency. Web Audio capture with Silero VAD creates the atmosphere of a real boardroom table.',
      icon: Mic,
      hex: '#00ff87', // Emerald
      badge: '< 350MS AUDIO'
    },
    {
      num: '05',
      title: 'OBJECTIVE ANALYTICS',
      description: 'Track your speech cadence, filler word ratios, answer directness, factual consistency, and clarity score across turns.',
      icon: BarChart3,
      hex: '#ff007a', // Pink / Magenta
      badge: 'LIVE METRICS'
    },
    {
      num: '06',
      title: 'OBJECTION HEATMAP',
      description: 'Discover precisely which slides or topics generated the highest friction and targeted challenges from the AI panel.',
      icon: Flame,
      hex: '#ff2a5f', // Rose
      badge: 'POST-SIM REPORT'
    }
  ];

  return (
    <section id="benefits" className="relative w-full py-12 sm:py-16 px-4 sm:px-6 bg-transparent overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 right-1/4 w-[700px] h-[450px] bg-purple-950/15 blur-[160px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-[15%] w-[450px] h-[450px] bg-cyan-950/15 blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Section Header */}
        <div className="max-w-3xl text-center flex flex-col items-center gap-3 mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
            Rehearse the pressure.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-sky-400">
              Not the script.
            </span>
          </h2>

          <p
            style={{ fontFamily: "'Michroma', sans-serif" }}
            className="text-xs sm:text-sm md:text-base text-slate-300 tracking-[0.06em] leading-relaxed max-w-2xl"
          >
            Eliminate blind spots before entering the real room. Built for startup founders, engineering leads, job candidates, and thesis candidates.
          </p>
        </div>

        {/* Liquid-Glass Benefits Grid: 2 Rows x 3 Columns (Loaded Together) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 w-full">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.num}
                className="relative rounded-[26px] p-6 sm:p-7 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-[#060913]/95 border border-white/[0.09] hover:border-white/[0.22] backdrop-blur-2xl flex flex-col justify-start h-full min-h-[300px] sm:min-h-[320px] overflow-hidden group transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_15px_35px_rgba(0,0,0,0.6)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_20px_45px_rgba(0,0,0,0.85)] hover:-translate-y-1 select-none gpu-accelerated"
              >
                {/* Top Inner Specular Light Edge */}
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                {/* Organic Liquid-Glass Refraction & Glow Aura at Bottom-Left */}
                <div 
                  className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full blur-[45px] pointer-events-none opacity-35 group-hover:opacity-75 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at 35% 65%, ${b.hex} 0%, transparent 70%)`
                  }}
                />

                {/* Subtle Fluid Bottom Rim Line */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[1.5px] opacity-25 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `linear-gradient(90deg, ${b.hex} 0%, transparent 65%)`
                  }}
                />

                {/* Top Section: Minimal Large Number + Floating Glass Icon & Badge */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    {/* Benefit Header Badge */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase">
                        BENEFIT
                      </span>
                      <span
                        style={{ fontFamily: "'Michroma', sans-serif" }}
                        className="text-xl sm:text-2xl font-bold tracking-tight text-white"
                      >
                        {b.num}
                      </span>
                    </div>

                    {/* Floating Circular Glass Icon Container & Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 rounded-full border tracking-wider uppercase"
                        style={{
                          borderColor: `${b.hex}40`,
                          color: b.hex,
                          backgroundColor: `${b.hex}10`,
                        }}
                      >
                        {b.badge}
                      </span>
                      
                      <div
                        className="w-11 h-11 rounded-full bg-slate-900/80 border backdrop-blur-xl flex items-center justify-center relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-110"
                        style={{
                          borderColor: `${b.hex}60`,
                          boxShadow: `inset 0 1px 1px rgba(255,255,255,0.2), 0 0 16px ${b.hex}30`
                        }}
                      >
                        <Icon className="w-5 h-5 transition-transform duration-300" style={{ color: b.hex }} />
                      </div>
                    </div>
                  </div>

                  {/* Geometric Heading */}
                  <h3
                    style={{ fontFamily: "'Michroma', sans-serif" }}
                    className="text-base sm:text-[17px] font-bold text-white tracking-[0.08em] uppercase mb-2.5 leading-snug group-hover:text-white transition-colors"
                  >
                    {b.title}
                  </h3>

                  {/* Body Text in Exo 2 with Generous Line Spacing */}
                  <p
                    style={{ fontFamily: "'Exo 2', sans-serif" }}
                    className="text-[14px] sm:text-[15px] text-slate-300 font-normal leading-relaxed"
                  >
                    {b.description}
                  </p>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
