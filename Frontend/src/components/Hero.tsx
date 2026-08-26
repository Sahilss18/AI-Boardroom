import React from 'react';
import { Carousel } from './Carousel';
import { Aurora } from './Aurora/Aurora';
import { Terminal, Shield, Cpu, HelpCircle, ExternalLink, Compass } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative w-full min-h-screen bg-obsidian flex flex-col justify-between overflow-hidden py-6 md:py-8">
      
      {/* 1. Ambient Background Effects */}
      {/* React Bits Flowing Aurora Background */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40 overflow-hidden">
        <Aurora 
          colorStops={['#00f0ff', '#bd00ff', '#00ff87']} 
          amplitude={1.2} 
          blend={0.65} 
          speed={0.5} 
        />
      </div>

      {/* Cyber Grid Pattern */}
      <div className="absolute inset-0 cyber-grid-overlay pointer-events-none z-0 opacity-60" />
      
      {/* Perspective Grid Floor tilted at bottom */}
      <div className="grid-floor pointer-events-none" />

      {/* Floating Nebula Glow Spheres */}
      <div className="absolute top-[10%] left-[10%] w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] rounded-full bg-cyan-500/8 blur-[100px] sm:blur-[130px] animate-pulse-glow z-0 pointer-events-none" style={{ animationDuration: '10s' }} />
      <div className="absolute top-[40%] right-[5%] w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] rounded-full bg-purple-500/6 blur-[110px] sm:blur-[140px] animate-pulse-glow z-0 pointer-events-none" style={{ animationDuration: '14s' }} />
      
      {/* 2. Futuristic Cyber Header Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 flex items-center justify-between relative z-20">
        {/* Logo */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative w-9 h-9 rounded-lg border border-neon-cyan/40 bg-slate-950/80 flex items-center justify-center overflow-hidden shadow-[0_0_10px_rgba(0,240,255,0.15)] group-hover:border-neon-cyan/80 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] transition-all duration-300">
            <Cpu className="w-5 h-5 text-neon-cyan group-hover:rotate-90 transition-transform duration-500" />
            <div className="absolute inset-0 bg-linear-to-tr from-transparent via-cyan-500/10 to-transparent" />
          </div>
          <span className="font-display font-bold text-xl tracking-wider bg-clip-text text-transparent bg-linear-to-r from-white via-slate-100 to-slate-400">
            AETHER<span className="text-neon-cyan font-mono group-hover:animate-pulse">.AI</span>
          </span>
        </div>

        {/* Links (Hidden on Mobile) */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-mono text-slate-400 tracking-widest uppercase">
          <a href="#swarm" className="hover:text-neon-cyan hover:glow-text-cyan transition-all duration-300 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" /> Agent Swarm
          </a>
          <a href="#terminal" className="hover:text-neon-cyan hover:glow-text-cyan transition-all duration-300 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" /> Terminal
          </a>
          <a href="#docs" className="hover:text-neon-cyan hover:glow-text-cyan transition-all duration-300 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Protocol
          </a>
        </nav>

        {/* Action Button */}
        <div>
          <button className="relative px-5 py-2 rounded-lg border border-neon-cyan/40 bg-cyan-950/10 font-mono text-xs text-neon-cyan tracking-wider uppercase overflow-hidden hover:bg-cyan-500/15 hover:border-neon-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300 active:scale-95 group cursor-pointer">
            <span className="relative z-10 flex items-center gap-1.5">
              Connect Node
              <ExternalLink className="w-3 h-3" />
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000" />
          </button>
        </div>
      </header>

      {/* 3. Hero Copywriting & Headings */}
      <main className="w-full max-w-7xl mx-auto px-6 flex-1 flex flex-col justify-center items-center relative z-10 mt-8 md:mt-12">
        <div className="text-center max-w-3xl flex flex-col items-center gap-4 md:gap-5 mb-10 md:mb-12">
          
          {/* Cyber Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800/80 bg-slate-950/70 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_#00f0ff]" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              DEPLOYMENT PROTOCOL 8.2 // LEVEL 4 SWARM
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight text-white leading-[1.1] md:leading-[1.05]">
            Orchestrate Your Operations With{' '}
            <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-blue-400 to-neon-purple">
              Autonomous AI Agents
              <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-neon-cyan via-blue-400 to-neon-purple opacity-30 blur-xs" />
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl font-sans mt-2 leading-relaxed">
            Deploy specialized, interconnected cognitive cores to automate system architecture, finance audit, market forecasts, and team synchronization inside a sandbox environment.
          </p>
        </div>

        {/* 4. Interactive 3D Conveyor Stage */}
        <Carousel />

      </main>

      {/* 5. Diagnostics Terminal Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-4 border-t border-slate-900/60 relative z-20 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-2 border-r border-slate-900/40 pr-2">
          <Cpu className="w-4 h-4 text-neon-cyan shrink-0 animate-pulse" />
          <div>
            <div className="text-slate-400 font-semibold uppercase">ACTIVE SYNC GRID</div>
            <div className="text-slate-600">CORES: 6/6 OPERATIONAL</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 border-r border-slate-900/40 pr-2">
          <Terminal className="w-4 h-4 text-neon-purple shrink-0" />
          <div>
            <div className="text-slate-400 font-semibold uppercase">SANDBOX TERMINAL</div>
            <div className="text-slate-600">TELEMETRY SECURE (SSH)</div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-r border-slate-900/40 pr-2">
          <Shield className="w-4 h-4 text-neon-emerald shrink-0" />
          <div>
            <div className="text-slate-400 font-semibold uppercase">COMPLIANCE PROTOCOL</div>
            <div className="text-slate-600">ISO-27001 SECURED LEDGER</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-600 shrink-0" />
          <div>
            <div className="text-slate-400 font-semibold uppercase">SYSTEM STABILITY</div>
            <div className="text-slate-600">99.998% RUNTIME EFFICIENCY</div>
          </div>
        </div>
      </footer>

    </section>
  );
};
