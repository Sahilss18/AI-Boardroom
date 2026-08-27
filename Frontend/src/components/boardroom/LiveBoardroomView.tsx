import React, { useState, useEffect, useRef } from 'react';
import { BoardroomMeetingGrid } from './BoardroomMeetingGrid';
import { LiveTranscriptFeed, type TranscriptItem } from './LiveTranscriptFeed';
import { DeliberationTelemetryPanel, type DeliberationLog } from './DeliberationTelemetryPanel';
import { AudioControlsBar } from './AudioControlsBar';
import { SimulationWebSocketClient, type SimulationEvent } from '../../services/websocket';
import { audioManager } from '../../services/audio';
import { ApiService } from '../../services/api';
import { AI_AGENTS } from '../../data/agents';
import { Orb } from '../Orb/Orb';

interface LiveBoardroomViewProps {
  sessionId: number;
  selectedPersonaIds: string[];
  documentFile: File | null;
  onExit: () => void;
}

export const LiveBoardroomView: React.FC<LiveBoardroomViewProps> = ({
  sessionId,
  selectedPersonaIds,
  documentFile: _documentFile,
  onExit,
}) => {
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [isRecording, setIsRecording] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [activePartialText, setActivePartialText] = useState('');
  const [deliberationLogs, setDeliberationLogs] = useState<DeliberationLog[]>([]);
  const [activeSpeakerPersonaId, setActiveSpeakerPersonaId] = useState<string | number | null>(null);
  const [showTranscriptFeed, setShowTranscriptFeed] = useState(true);
  const [showTelemetryPanel, setShowTelemetryPanel] = useState(true);

  // 24-Hour Clock for Top-Left Meeting Bar
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const wsClientRef = useRef<SimulationWebSocketClient | null>(null);

  // Initialize WebSocket Connection
  useEffect(() => {
    const ws = new SimulationWebSocketClient(
      sessionId,
      (event: SimulationEvent) => handleServerEvent(event),
      (state) => setConnectionState(state),
      (unpacked) => {
        // Handle incoming binary PCM audio chunk from backend TTS stream
        audioManager.queuePcmAudio(unpacked.audio, unpacked.sampleRate);
      }
    );

    ws.connect();
    wsClientRef.current = ws;

    return () => {
      ws.disconnect();
      audioManager.stopRecording();
      audioManager.flushPlayback();
    };
  }, [sessionId]);

  // Server Event Dispatcher
  const handleServerEvent = (event: SimulationEvent) => {
    const timestamp = new Date(event.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    switch (event.type) {
      case 'transcript.partial':
        if (event.payload?.text) {
          setActivePartialText(event.payload.text);
        }
        break;

      case 'transcript.final':
        if (event.payload?.text) {
          setActivePartialText('');
          setTranscripts((prev) => [
            ...prev,
            {
              id: `user_${Date.now()}`,
              speaker: 'user',
              text: event.payload.text,
              timestamp,
            },
          ]);
        }
        break;

      case 'agent.thinking':
        setDeliberationLogs((prev) => [
          {
            id: `think_${Date.now()}`,
            type: 'thinking',
            title: 'AGENT EVALUATION FAN-OUT',
            detail: event.payload?.message || 'Personas evaluating candidate utterance in parallel...',
            timestamp,
          },
          ...prev.slice(0, 30),
        ]);
        break;

      case 'agent.proposal':
        if (event.payload?.personaId) {
          const persona = AI_AGENTS.find((a) => a.id === event.payload.personaId) || { name: `Agent ${event.payload.personaId}` };
          setDeliberationLogs((prev) => [
            {
              id: `prop_${Date.now()}_${Math.random()}`,
              type: 'proposal',
              title: `${persona.name.toUpperCase()} PROPOSAL`,
              detail: `Action: ${event.payload.action || 'CHALLENGE'} (Priority: ${(event.payload.priority || 0.8).toFixed(2)}) — ${event.payload.reason || 'Evaluating claims'}`,
              timestamp,
            },
            ...prev.slice(0, 30),
          ]);
        }
        break;

      case 'orchestrator.decision':
        if (event.payload?.selectedPersonaId) {
          const selected = AI_AGENTS.find((a) => a.id === event.payload.selectedPersonaId) || { name: `Agent ${event.payload.selectedPersonaId}`, hex: '#00f0ff' };
          setActiveSpeakerPersonaId(event.payload.selectedPersonaId);
          setDeliberationLogs((prev) => [
            {
              id: `dec_${Date.now()}`,
              type: 'decision',
              title: `DECISION: ${selected.name.toUpperCase()} SPEAKS`,
              detail: event.payload.reason || 'Appointed active speaker by decision engine.',
              color: (selected as any).hex,
              timestamp,
            },
            ...prev.slice(0, 30),
          ]);
        }
        break;

      case 'agent.response.completed':
      case 'agent.response.chunk':
        if (event.payload?.text) {
          const speakerPersona = AI_AGENTS.find((a) => a.id === event.payload.personaId) || { name: 'Board Member', hex: '#00f0ff' };
          setTranscripts((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.speaker === 'agent' && last.personaId === event.payload.personaId && event.type === 'agent.response.chunk') {
              return [
                ...prev.slice(0, -1),
                { ...last, text: last.text + event.payload.text },
              ];
            }
            return [
              ...prev,
              {
                id: `agent_${Date.now()}`,
                speaker: 'agent',
                personaId: event.payload.personaId,
                personaName: speakerPersona.name,
                personaColor: (speakerPersona as any).hex,
                text: event.payload.text,
                timestamp,
              },
            ];
          });
        }
        break;

      case 'tts.stopped':
        audioManager.flushPlayback();
        break;

      case 'contradiction.detected':
        setDeliberationLogs((prev) => [
          {
            id: `contra_${Date.now()}`,
            type: 'contradiction',
            title: 'CONTRADICTION DETECTED',
            detail: event.payload?.resolution || 'Candidate claim contradicts uploaded slide grounding.',
            timestamp,
          },
          ...prev.slice(0, 30),
        ]);
        break;

      case 'question.satisfied':
        setDeliberationLogs((prev) => [
          {
            id: `sat_${Date.now()}`,
            type: 'satisfaction',
            title: 'OBJECTIVE SATISFIED',
            detail: event.payload?.description || 'Latent evaluation goal fulfilled.',
            timestamp,
          },
          ...prev.slice(0, 30),
        ]);
        break;

      default:
        break;
    }
  };

  // Toggle Live Microphone Capture
  const handleToggleMic = async () => {
    if (isRecording) {
      audioManager.stopRecording();
      setIsRecording(false);
      wsClientRef.current?.send({ type: 'audio.end' });
    } else {
      wsClientRef.current?.send({ type: 'audio.start' });
      const success = await audioManager.startRecording(
        (pcm16Buffer) => {
          wsClientRef.current?.sendBinary(pcm16Buffer);
        },
        (volume) => {
          setMicVolume(volume);
          // If user starts speaking while AI voice is playing -> Barge In Interruption
          if (volume > 0.3) {
            audioManager.flushPlayback();
          }
        }
      );
      if (success) {
        setIsRecording(true);
      }
    }
  };

  // Send Direct Text Message Fallback
  const handleSendText = (text: string) => {
    wsClientRef.current?.send({
      type: 'user.text',
      payload: { text },
    });
    setTranscripts((prev) => [
      ...prev,
      {
        id: `user_text_${Date.now()}`,
        speaker: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
  };

  // End Session Cleanup
  const handleEndSession = async () => {
    try {
      await ApiService.endSession(sessionId);
    } catch (err) {
      console.warn('Session end API call returned:', err);
    }
    audioManager.stopRecording();
    audioManager.flushPlayback();
    onExit();
  };

  return (
    <div className="relative w-full h-screen bg-obsidian text-slate-100 flex flex-col overflow-hidden px-4 sm:px-6 select-none">
      
      {/* Fullscreen Purple Orb Shader Background (Live Boardroom Only) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <Orb
            hoverIntensity={2}
            rotateOnHover={true}
            hue={0}
            forceHoverState={false}
            backgroundColor="#000000"
            scale={1.85}
          />
        </div>
      </div>

      {/* Background Ambience & Perspective Floor */}
      <div className="absolute inset-0 cyber-grid-overlay pointer-events-none z-0 opacity-40" />
      <div className="grid-floor pointer-events-none" />

      {/* Top Left Meeting Indicator (Positioned at top-left corner with Michroma font) */}
      <div className="fixed top-2.5 left-3.5 sm:top-3 sm:left-5 z-30 flex items-center gap-2 sm:gap-2.5 text-slate-100 pointer-events-none select-none">
        
        {/* 24-Hour Clock (Michroma) */}
        <span 
          className="text-xs sm:text-sm font-bold text-white tracking-widest drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          style={{ fontFamily: "'Michroma', sans-serif" }}
        >
          {currentTime}
        </span>

        {/* Separator Pipe */}
        <span className="text-slate-600 font-light text-xs sm:text-sm">|</span>

        {/* Title with Logo as R (Michroma) */}
        <div 
          className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-200 tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] uppercase"
          style={{ fontFamily: "'Michroma', sans-serif" }}
        >
          <span className="inline-flex items-center">
            {/* Logo as 'R' directly over background */}
            <img
              src="/logo.png"
              alt="R"
              className="h-3.5 sm:h-4 w-auto object-contain filter invert brightness-200 drop-shadow-[0_0_8px_rgba(0,240,255,0.8)] mr-[1px] inline-block"
            />
            <span className="text-white">eflection</span>
            <span className="text-neon-cyan ml-1">AI</span>
          </span>
          <span className="text-slate-500 mx-1">-</span>
          <span className="text-slate-300">Boardroom</span>
        </div>

      </div>

      {/* Center 3D Stage & Dual Telemetry Panels */}
      <main className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-26 sm:pt-30 md:pt-34 pb-14 sm:pb-16 relative z-10 min-h-0">
        
        {/* Left: Live Transcript Subtitle Feed (Toggled via Control Bar) */}
        {showTranscriptFeed && (
          <div className="lg:col-span-3 h-[calc(100vh-230px)] max-h-[560px] min-h-[300px] w-full order-2 lg:order-1 transition-all duration-300">
            <LiveTranscriptFeed
              transcripts={transcripts}
              activePartialText={activePartialText}
            />
          </div>
        )}

        {/* Center: Google Meet Adaptive Boardroom Stage (Starts Flush at the Same Top Line) */}
        <div className={`${
          showTranscriptFeed && showTelemetryPanel 
            ? 'lg:col-span-6' 
            : showTranscriptFeed || showTelemetryPanel 
            ? 'lg:col-span-9' 
            : 'lg:col-span-12'
        } w-full h-[calc(100vh-230px)] max-h-[560px] min-h-[300px] flex flex-col items-center justify-start order-1 lg:order-2 overflow-hidden transition-all duration-300`}>
            <BoardroomMeetingGrid
              agentIds={selectedPersonaIds}
              activeSpeakerId={activeSpeakerPersonaId}
            />
        </div>

        {/* Right: Deliberation Decision Graph Logs (Toggled via Control Bar) */}
        {showTelemetryPanel && (
          <div className="lg:col-span-3 h-[calc(100vh-230px)] max-h-[560px] min-h-[300px] w-full order-3 transition-all duration-300">
            <DeliberationTelemetryPanel
              logs={deliberationLogs}
              activeSpeakersCount={selectedPersonaIds.length}
            />
          </div>
        )}

      </main>

      {/* Bottom Controls Bar (Fixed Lowered Floating Dock) */}
      <footer className="fixed bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 w-full max-w-5xl mx-auto z-30 px-4 pointer-events-auto">
        <AudioControlsBar
          isRecording={isRecording}
          micVolume={micVolume}
          connectionState={connectionState}
          showTranscriptFeed={showTranscriptFeed}
          showTelemetryPanel={showTelemetryPanel}
          onToggleMic={handleToggleMic}
          onToggleTranscript={() => setShowTranscriptFeed((p) => !p)}
          onToggleTelemetry={() => setShowTelemetryPanel((p) => !p)}
          onSendText={handleSendText}
          onEndSession={handleEndSession}
        />
      </footer>

    </div>
  );
};
