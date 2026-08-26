import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export const MarketGapSection: React.FC = () => {
  const traditionalPoints = [
    'Rehearsing in front of a mirror with no pushback',
    'Static slide read-throughs with zero active objections',
    'Memorized scripts that fall apart upon the first interruption',
    'Predictable, polite questions from friends or colleagues',
    'Subjective, ungrounded feedback without factual metrics',
  ];

  const reflectionPoints = [
    'Full-duplex real-time voice interaction with sub-second latency',
    'Adversarial multi-agent panel representing CTO, CFO, BA, and HR',
    'Spontaneous interruptions and challenges when assertions lack proof',
    'Document-grounded RAG verification against your exact slides & specs',
    'Objective speech telemetry, consistency scores, and objection heatmaps',
  ];

  return (
    <section id="market-gap" className="relative w-full py-12 sm:py-16 px-4 sm:px-6 bg-transparent overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 w-[500px] h-[400px] bg-rose-950/15 blur-[150px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[400px] bg-cyan-950/15 blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto flex flex-col items-center">
        
        {/* Section Header */}
        <div className="max-w-3xl text-center flex flex-col items-center gap-3 mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
            Most preparation tools prepare your content.{' '}
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-sky-400">
              ReflectionAI prepares you for the people who will challenge it.
            </span>
          </h2>
        </div>

        {/* Side-by-Side Comparison Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full">
          
          {/* Left Column: Traditional Rehearsal */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
            className="relative rounded-[28px] p-7 sm:p-8 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-[#060913]/95 border border-rose-500/35 hover:border-rose-400/60 backdrop-blur-2xl flex flex-col justify-between overflow-hidden group transition-all duration-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.7)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_25px_55px_rgba(244,63,94,0.15)] select-none"
          >
            {/* Top Inner Specular Light Edge */}
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            {/* Organic Liquid-Glass Refraction & Glow Aura at Bottom-Left */}
            <div 
              className="absolute -bottom-12 -left-12 w-52 h-52 rounded-full blur-[50px] pointer-events-none opacity-30 group-hover:opacity-65 transition-opacity duration-500"
              style={{
                background: `radial-gradient(circle at 35% 65%, #f43f5e 0%, transparent 70%)`
              }}
            />

            {/* Fluid Bottom Rim Line */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-[1.5px] opacity-30 group-hover:opacity-75 transition-opacity duration-500 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, #f43f5e 0%, transparent 65%)`
              }}
            />

            {/* Card Content Top */}
            <div className="relative z-10">
              <div className="flex items-center gap-3.5 mb-6">
                <div
                  className="w-12 h-12 rounded-full bg-slate-900/80 border border-rose-500/60 backdrop-blur-xl flex items-center justify-center relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_18px_rgba(244,63,94,0.3)] transition-all duration-300 group-hover:scale-105"
                >
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3
                    style={{ fontFamily: "'Michroma', sans-serif" }}
                    className="text-base sm:text-lg font-bold text-white uppercase tracking-[0.08em]"
                  >
                    Traditional Preparation
                  </h3>
                  <p className="text-xs font-mono text-rose-400/90 uppercase font-semibold tracking-wider mt-0.5">
                    PASSIVE • ISOLATED • PREDICTABLE
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {traditionalPoints.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3 text-slate-300">
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <span
                      style={{ fontFamily: "'Exo 2', sans-serif" }}
                      className="text-[15px] sm:text-base text-slate-300 font-normal leading-[1.65]"
                    >
                      {pt}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Telemetry Tag */}
            <div className="mt-8 pt-4 border-t border-white/[0.07] text-[10px] font-mono text-rose-400/90 uppercase font-semibold flex items-center justify-between relative z-10">
              <span className="tracking-wider">STATUS: FAILS UNDER ADVERSARIAL PRESSURE</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
            </div>
          </motion.div>

          {/* Right Column: ReflectionAI */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
            className="relative rounded-[28px] p-7 sm:p-8 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-[#060913]/95 border border-cyan-500/35 hover:border-cyan-400/60 backdrop-blur-2xl flex flex-col justify-between overflow-hidden group transition-all duration-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.7)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_25px_55px_rgba(0,240,255,0.18)] select-none"
          >
            {/* Top Inner Specular Light Edge */}
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            {/* Organic Liquid-Glass Refraction & Glow Aura at Bottom-Left */}
            <div 
              className="absolute -bottom-12 -left-12 w-52 h-52 rounded-full blur-[50px] pointer-events-none opacity-35 group-hover:opacity-75 transition-opacity duration-500"
              style={{
                background: `radial-gradient(circle at 35% 65%, #00f0ff 0%, transparent 70%)`
              }}
            />

            {/* Fluid Bottom Rim Line */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-[1.5px] opacity-30 group-hover:opacity-75 transition-opacity duration-500 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, #00f0ff 0%, transparent 65%)`
              }}
            />

            {/* Card Content Top */}
            <div className="relative z-10">
              <div className="flex items-center gap-3.5 mb-6">
                <div
                  className="w-12 h-12 rounded-full bg-slate-900/80 border border-cyan-400/60 backdrop-blur-xl flex items-center justify-center relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_18px_rgba(0,240,255,0.3)] transition-all duration-300 group-hover:scale-105"
                >
                  <Sparkles className="w-5 h-5 text-neon-cyan" />
                </div>
                <div>
                  <h3
                    style={{ fontFamily: "'Michroma', sans-serif" }}
                    className="text-base sm:text-lg font-bold text-white uppercase tracking-[0.08em]"
                  >
                    ReflectionAI Simulation
                  </h3>
                  <p className="text-xs font-mono text-neon-cyan uppercase font-semibold tracking-wider mt-0.5">
                    FULL-DUPLEX • ADVERSARIAL • GROUNDED
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {reflectionPoints.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3 text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-neon-cyan shrink-0 mt-0.5" />
                    <span
                      style={{ fontFamily: "'Exo 2', sans-serif" }}
                      className="text-[15px] sm:text-base text-slate-200 font-normal leading-[1.65]"
                    >
                      {pt}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Telemetry Tag */}
            <div className="mt-8 pt-4 border-t border-white/[0.07] flex items-center justify-between text-[10px] font-mono text-neon-cyan font-bold uppercase relative z-10">
              <span className="tracking-wider">STATUS: PRODUCTION BOARDROOM READY</span>
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_6px_#00f0ff]" />
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
};
