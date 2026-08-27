import React from 'react';
import { Mic, ShieldCheck, Zap, GitFork } from 'lucide-react';

export const WhatIsSection: React.FC = () => {
  const pillars = [
    {
      id: 'listen',
      number: '01',
      title: 'LISTEN',
      subtitle: 'REAL-TIME SPOKEN INTERACTION',
      description: "Full-duplex audio pipeline with Silero Voice Activity Detection. The AI listens to the presenter's natural voice with sub-second responsiveness, capturing nuances and speech cadence.",
      icon: Mic,
      color: 'cyan',
      hex: '#00f0ff',
      telemetry: 'SILERO VAD // 16kHz PCM'
    },
    {
      id: 'verify',
      number: '02',
      title: 'VERIFY',
      subtitle: 'SOURCE DOCUMENT GROUNDING',
      description: 'Your uploaded slides, financial sheets, and architecture diagrams are parsed into isolated Qdrant vector spaces. Every factual claim is cross-checked in real-time.',
      icon: ShieldCheck,
      color: 'emerald',
      hex: '#00ff87',
      telemetry: 'QDRANT EMBEDDINGS // HYBRID RAG'
    },
    {
      id: 'challenge',
      number: '03',
      title: 'CHALLENGE',
      subtitle: 'ADVERSARIAL OBJECTION ENGINE',
      description: 'Agents identify conceptual gaps, mathematical discrepancies, and logical contradictions. They interrupt and probe rather than waiting politely.',
      icon: Zap,
      color: 'amber',
      hex: '#ff9f00',
      telemetry: 'CONTRADICTION ENGINE // BARGE-IN'
    },
    {
      id: 'adapt',
      number: '04',
      title: 'ADAPT',
      subtitle: 'DECENTRALIZED DELIBERATION',
      description: 'A centralized LangGraph Decision Engine scores all persona proposals, applying cooldowns and topic momentum to dynamically appoint the next speaker.',
      icon: GitFork,
      color: 'purple',
      hex: '#bd00ff',
      telemetry: 'LANGGRAPH.JS // DECISION GRAPH'
    }
  ];

  return (
    <section id="what-is" className="relative w-full py-12 sm:py-16 px-4 sm:px-6 bg-transparent overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-cyan-950/20 blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Section Header */}
        <div className="max-w-3xl text-center flex flex-col items-center gap-3 mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
            The room is artificial.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-sky-400">
              The pressure isn't.
            </span>
          </h2>

          <p
            style={{ fontFamily: "'Michroma', sans-serif" }}
            className="text-xs sm:text-sm md:text-base text-slate-300 tracking-[0.06em] leading-relaxed max-w-2xl mt-2"
          >
            ReflectionAI creates a virtual panel of specialized AI decision-makers who listen to your presentation, challenge your assumptions, verify your claims, and pressure-test your answers.
          </p>
        </div>

        {/* Liquid-Glass 4-Pillar Grid (Loaded Together) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 w-full">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.id}
                className="relative rounded-[26px] p-6 sm:p-7 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-[#060913]/95 border border-white/[0.09] hover:border-white/[0.22] backdrop-blur-2xl flex flex-col justify-start h-full min-h-[300px] sm:min-h-[320px] overflow-hidden group transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_15px_35px_rgba(0,0,0,0.6)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_20px_45px_rgba(0,0,0,0.85)] hover:-translate-y-1 select-none gpu-accelerated"
              >
                {/* Top Inner Specular Light Edge */}
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                {/* Organic Liquid-Glass Refraction & Glow Aura at Bottom-Left */}
                <div 
                  className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full blur-[45px] pointer-events-none opacity-35 group-hover:opacity-75 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at 35% 65%, ${pillar.hex} 0%, transparent 70%)`
                  }}
                />

                {/* Subtle Fluid Bottom Rim Line */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[1.5px] opacity-25 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `linear-gradient(90deg, ${pillar.hex} 0%, transparent 65%)`
                  }}
                />

                {/* Top Section: Minimal Large Number + Floating Glass Icon */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    {/* Pillar Header Badge */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase">
                        PILLAR
                      </span>
                      <span
                        style={{ fontFamily: "'Michroma', sans-serif" }}
                        className="text-xl sm:text-2xl font-bold tracking-tight text-white"
                      >
                        {pillar.number}
                      </span>
                    </div>

                    {/* Floating Circular Glass Icon Container */}
                    <div
                      className="w-11 h-11 rounded-full bg-slate-900/80 border backdrop-blur-xl flex items-center justify-center relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-110"
                      style={{
                        borderColor: `${pillar.hex}60`,
                        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.2), 0 0 16px ${pillar.hex}30`
                      }}
                    >
                      <Icon className="w-5 h-5 transition-transform duration-300" style={{ color: pillar.hex }} />
                    </div>
                  </div>

                  {/* Geometric Heading in Michroma */}
                  <h3
                    style={{ fontFamily: "'Michroma', sans-serif" }}
                    className="text-base sm:text-[17px] font-bold text-white tracking-[0.08em] uppercase mb-1.5 leading-snug group-hover:text-white transition-colors"
                  >
                    {pillar.title}
                  </h3>

                  {/* Clean Uppercase Colored Subheading */}
                  <div
                    style={{ fontFamily: "'Exo 2', sans-serif", color: pillar.hex }}
                    className="text-xs font-semibold tracking-wider uppercase mb-3.5"
                  >
                    {pillar.subtitle}
                  </div>

                  {/* Body Text in Exo 2 with Generous Line Spacing */}
                  <p
                    style={{ fontFamily: "'Exo 2', sans-serif" }}
                    className="text-[14px] sm:text-[15px] text-slate-300 font-normal leading-relaxed"
                  >
                    {pillar.description}
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
