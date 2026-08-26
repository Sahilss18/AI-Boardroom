import React, { useEffect, useRef } from 'react';
import { User, Cpu, Sparkles } from 'lucide-react';

export interface TranscriptItem {
  id: string;
  speaker: 'user' | 'agent' | 'system';
  personaId?: string | number;
  personaName?: string;
  personaColor?: string;
  text: string;
  isPartial?: boolean;
  timestamp: string;
}

interface LiveTranscriptFeedProps {
  transcripts: TranscriptItem[];
  activePartialText: string;
}

export const LiveTranscriptFeed: React.FC<LiveTranscriptFeedProps> = ({
  transcripts,
  activePartialText,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, activePartialText]);

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/40 via-slate-950/50 to-slate-950/75 border border-white/[0.12] backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.18)] overflow-hidden group transition-all duration-300">
      
      {/* Specular Liquid Glass Top Glow & Edge Refraction */}
      <div className="absolute -top-12 left-1/4 -translate-x-1/2 w-48 h-20 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-transparent pointer-events-none rounded-2xl" />

      {/* Top Header */}
      <div className="relative flex items-center justify-between pb-3 border-b border-white/[0.08] z-10">
        <div 
          className="flex items-center gap-2 text-white font-bold tracking-[0.08em] whitespace-nowrap overflow-hidden"
          style={{ fontFamily: "'Michroma', sans-serif" }}
        >
          <div className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.25)] shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-neon-cyan" />
          </div>
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-100 whitespace-nowrap">
            LIVE TRANSCRIPT FEED
          </span>
        </div>
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0 ml-2" />
      </div>

      {/* Transcript Log Feed */}
      <div 
        className="relative flex-1 overflow-y-auto space-y-3.5 py-3 pr-1 text-xs no-scrollbar z-10"
        style={{ fontFamily: "'Exo 2', sans-serif" }}
      >
        {transcripts.length === 0 && !activePartialText && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-[12px] p-6 leading-relaxed">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
            <span 
              className="text-slate-300 font-semibold uppercase tracking-wider text-[11px] mb-1"
              style={{ fontFamily: "'Michroma', sans-serif" }}
            >
              AWAITING SPEECH
            </span>
            <span className="text-slate-400 text-xs max-w-[240px]">
              Turn on your microphone or type a message to address the board.
            </span>
          </div>
        )}

        {transcripts.map((item) => {
          const isUser = item.speaker === 'user';
          return (
            <div
              key={item.id}
              className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div 
                className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider"
                style={{ fontFamily: "'Michroma', sans-serif" }}
              >
                {isUser ? (
                  <>
                    <span className="text-neon-emerald">PRESENTER</span>
                    <User className="w-3 h-3 text-neon-emerald" />
                  </>
                ) : (
                  <>
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    <span className="uppercase" style={{ color: item.personaColor || '#00f0ff' }}>
                      {item.personaName || `AGENT ${item.personaId}`}
                    </span>
                  </>
                )}
                <span className="text-slate-500 font-sans font-normal text-[10px]">• {item.timestamp}</span>
              </div>

              <div
                className={`p-3.5 rounded-2xl max-w-[90%] text-sm leading-relaxed backdrop-blur-md transition-all shadow-md ${
                  isUser
                    ? 'bg-emerald-950/35 border border-emerald-500/40 text-emerald-50 shadow-[0_4px_16px_rgba(0,255,135,0.1),inset_0_1px_1px_rgba(255,255,255,0.15)]'
                    : 'bg-slate-900/60 border border-white/[0.1] text-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.08)]'
                }`}
                style={!isUser && item.personaColor ? { borderColor: `${item.personaColor}50` } : {}}
              >
                {item.text}
              </div>
            </div>
          );
        })}

        {/* Live Partial Whisper Speech Overlay */}
        {activePartialText && (
          <div className="flex flex-col gap-1.5 items-end">
            <div 
              className="flex items-center gap-1.5 text-[10px] text-neon-emerald font-bold tracking-wider"
              style={{ fontFamily: "'Michroma', sans-serif" }}
            >
              <span>PRESENTER (SPEAKING...)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-ping" />
            </div>
            <div className="p-3.5 rounded-2xl max-w-[90%] bg-emerald-950/45 border border-emerald-400/60 text-white italic animate-pulse shadow-[0_0_20px_rgba(0,255,135,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]">
              "{activePartialText}"
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

    </div>
  );
};
