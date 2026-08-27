import React from 'react';
import {
  Mic,
  Search,
  Database,
  Users,
  Layers,
  Cpu,
  Radio,
  Volume2
} from 'lucide-react';

export const IntelligenceFlowSection: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'USER SPEAKS',
      subtitle: 'REALTIME AUDIO STREAM',
      description: 'Candidate voice is captured via 16kHz PCM WebSocket stream and analyzed by Silero Voice Activity Detection.',
      icon: Mic,
      color: '#00f0ff', // Cyan / electric blue
      glowClass: 'from-cyan-500/20 to-transparent',
    },
    {
      step: '02',
      title: 'SEMANTIC ANALYSIS',
      subtitle: 'CLAIM & INTENT EXTRACTION',
      description: 'The Semantic Engine parses utterances into concrete factual assertions, technical entities, and underlying intentions.',
      icon: Search,
      color: '#00ff87', // Emerald green
      glowClass: 'from-emerald-500/20 to-transparent',
    },
    {
      step: '03',
      title: 'RAG GROUNDING',
      subtitle: 'DOCUMENT CROSS-CHECK',
      description: 'Vector embeddings in Qdrant verify candidate claims against uploaded pitch decks, architecture RFCs, and ledgers.',
      icon: Database,
      color: '#a855f7', // Violet
      glowClass: 'from-purple-500/20 to-transparent',
    },
    {
      step: '04',
      title: 'PARALLEL EVALUATION',
      subtitle: 'COGNITIVE AGENT FAN-OUT',
      description: 'All active personas evaluate the turn simultaneously inside isolated private memory contexts and submit proposals.',
      icon: Users,
      color: '#ff9f00', // Amber / orange
      glowClass: 'from-amber-500/20 to-transparent',
    },
    {
      step: '05',
      title: 'AGENT PROPOSALS',
      subtitle: 'COGNITIVE DELIBERATION',
      description: 'Each AI panel member independently generates objections, follow-up questions, challenges, and evidence-backed recommendations based on its domain expertise.',
      icon: Layers,
      color: '#3b82f6', // Blue
      glowClass: 'from-blue-500/20 to-transparent',
    },
    {
      step: '06',
      title: 'DECISION ENGINE',
      subtitle: 'MATHEMATICAL SPEAKER SCORING',
      description: 'LangGraph.js scores proposals based on contradiction weight, missing evidence, speaking cooldowns, and topic fatigue.',
      icon: Cpu,
      color: '#ec4899', // Magenta / pink
      glowClass: 'from-pink-500/20 to-transparent',
    },
    {
      step: '07',
      title: 'ACTIVE SPEAKER',
      subtitle: 'ELECTED CORE RESPONSE',
      description: 'The appointed agent generates an adversarial probe, clarification, or challenge grounded in verified evidence.',
      icon: Radio,
      color: '#6366f1', // Royal blue
      glowClass: 'from-indigo-500/20 to-transparent',
    },
    {
      step: '08',
      title: 'REALTIME RESPONSE',
      subtitle: 'STREAMING VOICE & HUD',
      description: 'Audio chunks stream to the user in <350ms, while real-time contradiction tags and satisfaction metrics update on the HUD.',
      icon: Volume2,
      color: '#06b6d4', // Cyan / teal
      glowClass: 'from-teal-500/20 to-transparent',
    },
  ];

  return (
    <section
      id="intelligence"
      className="relative w-full py-12 sm:py-16 px-4 sm:px-6 bg-transparent overflow-hidden"
    >
      {/* Background Soft Atmospheric Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] max-w-[95vw] h-[600px] bg-cyan-950/15 blur-[170px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-[15%] w-[450px] h-[450px] bg-purple-950/10 blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Section Header */}
        <div className="max-w-3xl text-center flex flex-col items-center gap-3 mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
            They don't just talk.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-sky-400">
              They deliberate.
            </span>
          </h2>

          <p
            style={{ fontFamily: "'Michroma', sans-serif" }}
            className="text-xs sm:text-sm md:text-base text-slate-300 tracking-[0.06em] leading-relaxed max-w-3xl"
          >
            <span className="text-white font-bold">Many minds. One decision engine.</span> Unlike basic chatbots that take turns linearly, ReflectionAI runs a decentralized multi-agent cognitive state machine mediated by LangGraph.
          </p>
        </div>

        {/* Liquid-Glass 2x4 Process Grid (Loaded Together) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 w-full">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="relative rounded-[26px] p-6 sm:p-7 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-[#060913]/95 border border-white/[0.09] hover:border-white/[0.22] backdrop-blur-2xl flex flex-col justify-start h-full min-h-[310px] sm:min-h-[330px] overflow-hidden group transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_15px_35px_rgba(0,0,0,0.6)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_20px_45px_rgba(0,0,0,0.85)] hover:-translate-y-1 select-none gpu-accelerated"
              >
                {/* Top Inner Specular Light Edge */}
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                {/* Organic Liquid-Glass Refraction & Glow Aura at Bottom-Left */}
                <div 
                  className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full blur-[45px] pointer-events-none opacity-35 group-hover:opacity-75 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at 35% 65%, ${s.color} 0%, transparent 70%)`
                  }}
                />

                {/* Subtle Fluid Bottom Rim Line */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[1.5px] opacity-25 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `linear-gradient(90deg, ${s.color} 0%, transparent 65%)`
                  }}
                />

                {/* Top Section: Minimal Large Stage Number + Floating Glass Icon */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    {/* Stage Header Badge */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase">
                        STAGE
                      </span>
                      <span
                        style={{ fontFamily: "'Michroma', sans-serif" }}
                        className="text-xl sm:text-2xl font-bold tracking-tight text-white"
                      >
                        {s.step}
                      </span>
                    </div>

                    {/* Floating Circular Glass Icon Container */}
                    <div
                      className="w-11 h-11 rounded-full bg-slate-900/80 border backdrop-blur-xl flex items-center justify-center relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-110"
                      style={{
                        borderColor: `${s.color}60`,
                        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.2), 0 0 16px ${s.color}30`
                      }}
                    >
                      <Icon className="w-5 h-5 transition-transform duration-300" style={{ color: s.color }} />
                    </div>
                  </div>

                  {/* Geometric Heading */}
                  <h3
                    style={{ fontFamily: "'Michroma', sans-serif" }}
                    className="text-base sm:text-[17px] font-bold text-white tracking-[0.08em] uppercase mb-1.5 leading-snug group-hover:text-white transition-colors"
                  >
                    {s.title}
                  </h3>

                  {/* Clean Uppercase Colored Subheading */}
                  <div
                    style={{ fontFamily: "'Exo 2', sans-serif", color: s.color }}
                    className="text-xs font-semibold tracking-wider uppercase mb-3.5"
                  >
                    {s.subtitle}
                  </div>

                  {/* Body Text in Exo 2 with Generous Line Spacing */}
                  <p
                    style={{ fontFamily: "'Exo 2', sans-serif" }}
                    className="text-[14px] sm:text-[15px] text-slate-300 font-normal leading-relaxed"
                  >
                    {s.description}
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
