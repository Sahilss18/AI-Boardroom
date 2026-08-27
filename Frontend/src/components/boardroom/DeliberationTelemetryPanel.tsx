import React from 'react';
import { Activity, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';

export interface DeliberationLog {
  id: string;
  type: 'thinking' | 'proposal' | 'decision' | 'contradiction' | 'satisfaction';
  title: string;
  detail: string;
  color?: string;
  timestamp: string;
}

interface DeliberationTelemetryPanelProps {
  logs: DeliberationLog[];
  activeSpeakersCount: number;
}

export const DeliberationTelemetryPanel: React.FC<DeliberationTelemetryPanelProps> = ({
  logs,
}) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/40 via-slate-950/50 to-slate-950/75 border border-white/[0.12] backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.18)] overflow-hidden group transition-all duration-300">
      
      {/* Specular Liquid Glass Top Glow & Edge Refraction */}
      <div className="absolute -top-12 right-1/4 translate-x-1/2 w-48 h-20 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-transparent pointer-events-none rounded-2xl" />

      {/* Top Header */}
      <div className="relative flex items-center justify-between pb-3 border-b border-white/[0.08] z-10">
        <div 
          className="flex items-center gap-2 text-white font-bold tracking-[0.08em] whitespace-nowrap overflow-hidden"
          style={{ fontFamily: "'Michroma', sans-serif" }}
        >
          <div className="p-1 rounded-lg bg-purple-500/10 border border-purple-400/30 text-neon-purple shadow-[0_0_10px_rgba(189,0,255,0.25)] shrink-0">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-100 whitespace-nowrap">
            DECISION TELEMETRY
          </span>
        </div>
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping shrink-0 ml-2" />
      </div>

      {/* Deliberation Stream */}
      <div 
        className="relative flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs no-scrollbar z-10"
        style={{ fontFamily: "'Exo 2', sans-serif" }}
      >
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-[12px] p-6 leading-relaxed">
            <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-400/30 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(189,0,255,0.2)]">
              <Cpu className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
            <span 
              className="text-slate-300 font-semibold uppercase tracking-wider text-[11px] mb-1"
              style={{ fontFamily: "'Michroma', sans-serif" }}
            >
              MONITORING REASONING
            </span>
            <span className="text-slate-400 text-xs max-w-[240px]">
              Agent proposals, scoring, contradiction checks, and decisions will stream live here.
            </span>
          </div>
        )}

        {logs.map((log) => {
          let Icon = Cpu;
          let badgeColor = 'text-cyan-400 bg-cyan-950/30 border-cyan-500/30 shadow-[0_4px_16px_rgba(0,240,255,0.06)]';

          if (log.type === 'contradiction') {
            Icon = ShieldAlert;
            badgeColor = 'text-rose-300 bg-rose-950/40 border-rose-500/50 shadow-[0_4px_16px_rgba(244,63,94,0.1)]';
          } else if (log.type === 'decision') {
            Icon = Activity;
            badgeColor = 'text-purple-300 bg-purple-950/40 border-purple-500/50 shadow-[0_4px_16px_rgba(189,0,255,0.1)]';
          } else if (log.type === 'satisfaction') {
            Icon = CheckCircle;
            badgeColor = 'text-emerald-300 bg-emerald-950/40 border-emerald-500/50 shadow-[0_4px_16px_rgba(0,255,135,0.1)]';
          }

          return (
            <div
              key={log.id}
              className={`p-3.5 rounded-xl border backdrop-blur-md transition-all duration-300 ${badgeColor}`}
            >
              <div className="flex items-center justify-between font-bold mb-1.5">
                <span 
                  className="flex items-center gap-1.5 uppercase text-[11px] tracking-wide"
                  style={{ fontFamily: "'Michroma', sans-serif" }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {log.title}
                </span>
                <span className="text-[10px] text-slate-400 font-sans opacity-85">{log.timestamp}</span>
              </div>
              <p 
                className="text-slate-200 text-xs leading-relaxed mt-1"
                style={{ fontFamily: "'Exo 2', sans-serif" }}
              >
                {log.detail}
              </p>
            </div>
          );
        })}
      </div>

    </div>
  );
};
