import React from 'react';
import { Cpu, Terminal, Shield, HelpCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-transparent py-8 px-6 relative z-10 text-xs font-mono text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand & Copyright */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg border border-cyan-500/30 bg-slate-900 flex items-center justify-center p-1">
            <img
              src="/logo.png"
              alt="ReflectionAI Logo"
              className="w-full h-full object-contain filter invert brightness-200 drop-shadow-[0_0_3px_#00f0ff]"
            />
          </div>
          <div>
            <div
              style={{ fontFamily: "'Michroma', sans-serif" }}
              className="text-xs text-slate-300 font-bold tracking-[0.14em] uppercase"
            >
              REFLECTION <span className="text-neon-cyan">AI</span> <span className="text-[10px] text-slate-500 font-mono font-normal">// SIMULATION PROTOCOL</span>
            </div>
            <div className="text-[10px] text-slate-600">© 2026 Saturday Motive Core. All rights reserved.</div>
          </div>
        </div>

        {/* Diagnostic Status Tickers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px]">
          <div className="flex items-center gap-2 border-r border-slate-900 pr-3">
            <Cpu className="w-3.5 h-3.5 text-neon-cyan shrink-0 animate-pulse" />
            <div>
              <div className="text-slate-400 font-semibold uppercase">ACTIVE SWARM</div>
              <div className="text-slate-600">7 CORES ONLINE</div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-r border-slate-900 pr-3">
            <Terminal className="w-3.5 h-3.5 text-neon-purple shrink-0" />
            <div>
              <div className="text-slate-400 font-semibold uppercase">GATEWAY (WS)</div>
              <div className="text-slate-600">ENCRYPTED PCM16</div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-r border-slate-900 pr-3">
            <Shield className="w-3.5 h-3.5 text-neon-emerald shrink-0" />
            <div>
              <div className="text-slate-400 font-semibold uppercase">RAG ISOLATION</div>
              <div className="text-slate-600">SESSION SCOPED</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <div>
              <div className="text-slate-400 font-semibold uppercase">STABILITY</div>
              <div className="text-slate-600">99.998% UPTIME</div>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
