import React from 'react';
import { AI_AGENTS } from '../../data/agents';
import { FileText, Users, Play, Loader2, Sparkles, AlertCircle, ChevronLeft } from 'lucide-react';
import type { DocumentParseResult } from '../../services/api';

interface SessionSummaryStepProps {
  file: File | null;
  parseResult: DocumentParseResult | null;
  selectedPersonaIds: string[];
  intensity: 'CALM' | 'STANDARD' | 'AGGRESSIVE' | 'ADVERSARIAL';
  isInitializing: boolean;
  initStage: string;
  error: string | null;
  onInitialize: () => void;
  onBack?: () => void;
}

export const SessionSummaryStep: React.FC<SessionSummaryStepProps> = ({
  file,
  parseResult,
  selectedPersonaIds,
  intensity,
  isInitializing,
  initStage,
  error,
  onInitialize,
  onBack,
}) => {
  const selectedAgents = AI_AGENTS.filter((a) => selectedPersonaIds.includes(a.id));

  return (
    <div className="flex flex-col gap-5 w-full select-none">
      <div className="text-center">
        <h3
          style={{ fontFamily: "'Michroma', sans-serif" }}
          className="text-lg sm:text-xl font-bold text-white tracking-wider uppercase"
        >
          Session Summary.
        </h3>
        <p
          style={{ fontFamily: "'Exo 2', sans-serif" }}
          className="text-xs sm:text-[13px] text-slate-300 font-normal mt-1 max-w-xl mx-auto"
        >
          Review your boardroom parameters before establishing full-duplex session connection.
        </p>
      </div>

      {/* Grid of Summary Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Document Parsing Tile */}
        <div className="p-5 sm:p-6 rounded-[22px] bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-[#060914]/95 border border-white/[0.09] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-neon-cyan uppercase font-bold mb-3">
              <FileText className="w-4 h-4" />
              GROUNDING DOCUMENT
            </div>
            {file ? (
              <div>
                <div
                  style={{ fontFamily: "'Michroma', sans-serif" }}
                  className="text-sm sm:text-base font-bold text-white uppercase tracking-wide truncate"
                >
                  {file.name}
                </div>
                <div
                  style={{ fontFamily: "'Exo 2', sans-serif" }}
                  className="text-xs text-slate-300 mt-1.5"
                >
                  {(file.size / 1024).toFixed(0)} KB • {parseResult?.chunksCount || 0} Semantic Chunks Ready
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500 italic py-2">
                No grounding document provided (General interview mode)
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.07] text-[10px] font-mono text-slate-400">
            STORAGE: QDRANT VECTOR SESSION ISOLATION
          </div>
        </div>

        {/* Intensity & Mode Tile */}
        <div className="p-5 sm:p-6 rounded-[22px] bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-[#060914]/95 border border-white/[0.09] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-xs font-mono text-neon-purple uppercase font-bold">
                <Sparkles className="w-4 h-4" />
                SIMULATION INTENSITY
              </span>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-neon-purple border border-purple-500/40">
                {intensity}
              </span>
            </div>
            <div
              style={{ fontFamily: "'Michroma', sans-serif" }}
              className="text-sm sm:text-base font-bold text-white uppercase tracking-wide"
            >
              {selectedAgents.length} Active Interrogators
            </div>
            <div
              style={{ fontFamily: "'Exo 2', sans-serif" }}
              className="text-xs text-slate-300 mt-1.5"
            >
              Orchestrated via LangGraph State Engine & Mathematical Scoring
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.07] text-[10px] font-mono text-slate-400">
            PROTOCOL: FASTIFY WEBSOCKET PCM 16kHz
          </div>
        </div>

      </div>

      {/* Selected Boardroom Panel Grid */}
      <div className="p-5 sm:p-6 rounded-[22px] bg-gradient-to-b from-slate-900/70 via-slate-950/85 to-[#060914]/90 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 uppercase font-bold mb-3.5">
          <Users className="w-4 h-4 text-neon-cyan" />
          ACTIVE BOARDROOM PERSONAS ({selectedAgents.length})
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {selectedAgents.map((agent) => (
            <div
              key={agent.id}
              className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.08] flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-lg border shrink-0 overflow-hidden relative flex items-center justify-center bg-slate-900"
                style={{ borderColor: `${agent.hex}60`, backgroundColor: `${agent.hex}15` }}
              >
                {agent.image ? (
                  <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-mono text-xs font-bold" style={{ color: agent.hex }}>
                    {agent.shortTitle}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  style={{ fontFamily: "'Michroma', sans-serif" }}
                  className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wide truncate"
                >
                  {agent.name}
                </div>
                <div
                  style={{ fontFamily: "'Exo 2', sans-serif", color: agent.hex }}
                  className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-wide truncate mt-0.5"
                >
                  {agent.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs font-mono">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Buttons: Back + Initialize */}
      <div className="flex items-center gap-3.5 mt-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={isInitializing}
            style={{ fontFamily: "'Michroma', sans-serif" }}
            className="px-6 py-4 rounded-xl border border-white/[0.1] hover:border-white/[0.22] bg-slate-900/50 hover:bg-slate-900/80 text-slate-300 hover:text-white text-xs tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}

        <button
          onClick={onInitialize}
          disabled={isInitializing}
          style={{ fontFamily: "'Michroma', sans-serif" }}
          className="flex-1 relative px-8 py-4 rounded-xl border border-cyan-300/80 bg-gradient-to-r from-neon-cyan via-cyan-400 to-sky-400 text-slate-950 font-bold text-xs sm:text-sm tracking-[0.1em] uppercase overflow-hidden shadow-[0_0_35px_rgba(0,240,255,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_0_55px_rgba(0,240,255,0.85)] hover:scale-[1.01] active:scale-98 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isInitializing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{initStage || 'INITIALIZING BOARDROOM...'}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
              <span>INITIALIZE BOARDROOM SIMULATION</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
