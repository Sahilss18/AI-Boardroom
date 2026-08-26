import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Hand, 
  Subtitles, 
  Activity, 
  PhoneOff, 
  Send,
  MessageSquare
} from 'lucide-react';

interface AudioControlsBarProps {
  isRecording: boolean;
  micVolume: number;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  showTranscriptFeed: boolean;
  showTelemetryPanel: boolean;
  onToggleMic: () => void;
  onToggleTranscript: () => void;
  onToggleTelemetry: () => void;
  onSendText: (text: string) => void;
  onEndSession: () => void;
}

export const AudioControlsBar: React.FC<AudioControlsBarProps> = ({
  isRecording,
  micVolume,
  connectionState,
  showTranscriptFeed,
  showTelemetryPanel,
  onToggleMic,
  onToggleTranscript,
  onToggleTelemetry,
  onSendText,
  onEndSession,
}) => {
  const [inputText, setInputText] = useState('');
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendText(inputText.trim());
    setInputText('');
  };

  const handleRaiseHand = () => {
    setIsHandRaised((prev) => !prev);
    if (!isRecording) {
      onToggleMic();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-2 z-30">
      
      {/* Expandable Chat Floating Input for mobile */}
      {showChatInput && (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md flex items-center gap-2 p-2 rounded-2xl bg-slate-900/95 border border-cyan-500/40 backdrop-blur-2xl shadow-2xl mb-1 transition-all animate-in fade-in slide-in-from-bottom-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your response to the boardroom..."
            className="flex-1 px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-sans text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            autoFocus
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Main Google Meet Style Capsule Control Bar */}
      <div className="px-4 py-2.5 rounded-full bg-[#161a26]/95 border border-white/[0.12] backdrop-blur-2xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] flex items-center justify-center gap-2.5 sm:gap-3.5 transition-all">
        
        {/* Connection State Pill */}
        <div 
          title={`Boardroom Connection: ${connectionState.toUpperCase()}`}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-white/[0.06] text-[10px] font-mono text-slate-400"
        >
          <span className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`} />
          <span className="uppercase">{connectionState === 'connected' ? 'LIVE' : connectionState}</span>
        </div>

        {/* 1. Microphone Toggle */}
        <div className="relative flex items-center">
          <button
            onClick={onToggleMic}
            title={isRecording ? 'Mute Microphone' : 'Unmute Microphone'}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
              isRecording
                ? 'bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.6)] scale-105'
                : 'bg-slate-800/90 hover:bg-slate-700 text-rose-400 border border-white/[0.08]'
            }`}
          >
            {isRecording ? (
              <Mic className="w-5 h-5 fill-current" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
            {/* Audio Pulse Wave when speaking */}
            {isRecording && micVolume > 0.05 && (
              <span 
                className="absolute inset-0 rounded-full border border-cyan-300 animate-ping opacity-60 pointer-events-none"
                style={{ animationDuration: '1.2s' }}
              />
            )}
          </button>
        </div>

        {/* 2. Raise Hand (Barge-In / Speak) */}
        <button
          onClick={handleRaiseHand}
          title="Raise Hand to Interrupt / Address Board"
          className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
            isHandRaised
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.5)] scale-105'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border-white/[0.08]'
          }`}
        >
          <Hand className="w-5 h-5" />
        </button>

        {/* 3. Live Transcript Feed Toggle (Closed / Open) */}
        <button
          onClick={onToggleTranscript}
          title={showTranscriptFeed ? 'Hide Live Transcript Feed' : 'Show Live Transcript Feed'}
          className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
            showTranscriptFeed
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_14px_rgba(0,240,255,0.3)]'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-white/[0.08]'
          }`}
        >
          <Subtitles className="w-5 h-5" />
        </button>

        {/* 4. Decision Telemetry Panel Toggle (Closed / Open) */}
        <button
          onClick={onToggleTelemetry}
          title={showTelemetryPanel ? 'Hide Decision Telemetry' : 'Show Decision Telemetry'}
          className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
            showTelemetryPanel
              ? 'bg-purple-500/20 text-purple-300 border-purple-400/50 shadow-[0_0_14px_rgba(168,85,247,0.3)]'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-white/[0.08]'
          }`}
        >
          <Activity className="w-5 h-5" />
        </button>

        {/* 5. Inline Text Input Pill */}
        <form
          onSubmit={handleSubmit}
          className="hidden md:flex items-center bg-slate-900/90 border border-slate-700/60 rounded-full px-4 py-1.5 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/40 transition-all w-60 lg:w-72"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your response..."
            className="bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none flex-1 min-w-0"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-1 text-cyan-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Mobile Chat Toggle Button */}
        <button
          onClick={() => setShowChatInput((prev) => !prev)}
          title="Toggle Text Response"
          className="md:hidden w-11 h-11 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/[0.08] flex items-center justify-center transition-all cursor-pointer"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* 6. End Call Pill Button (Red GMeet capsule) */}
        <button
          onClick={onEndSession}
          title="Leave Boardroom Simulation"
          className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center transition-all shadow-[0_0_20px_rgba(239,68,68,0.45)] cursor-pointer"
        >
          <PhoneOff className="w-5 h-5 fill-current" />
        </button>

      </div>

    </div>
  );
};
